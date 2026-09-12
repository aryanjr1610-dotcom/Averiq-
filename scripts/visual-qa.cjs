/* global require, process, console, URL, document, innerWidth, module */
/* eslint @typescript-eslint/no-require-imports: "off" */
/* Local visual QA only. All student/session data below is illustrative.
 * Fixtures are injected by Playwright routing, never by production code.
 * No request to Supabase is allowed to leave this browser context. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || require('node:path').join(require('node:os').homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const fs = require('node:fs/promises');
const path = require('node:path');
const sampleBytes = require('node:fs').readFileSync('academic-sample-v2.json');
const sample = JSON.parse(sampleBytes.toString(sampleBytes[0] === 255 ? 'utf16le' : 'utf8').replace(/^\uFEFF/, ''));
const sampleChapter = sample.subjects[0].courses[0].chapters[0];
const sampleTopic = sampleChapter.topics.find(t => t.lessons.some(l => l.document.schemaVersion === 2));
const sampleLesson = sampleTopic.lessons.find(l => l.document.schemaVersion === 2);
const lesson = {id:'fixture-lesson',title:sampleLesson.title,status:'published',topic_id:'fixture-topic',estimated_minutes:12};
const chapter = {id:'fixture-chapter',title:'Electric charges and fields',status:'published',curriculum_subject_id:'physics',description:sampleChapter.description,estimated_minutes:35};
const subject = {id:'fixture-subject',code:'physics',title:'Physics'};
const placement = {id:'physics',subject_id:subject.id,title:'Physics'};
const topic = {id:'fixture-topic',chapter_id:chapter.id,title:sampleTopic.title};
const version = {id:'fixture-version',lesson_id:lesson.id,content:sampleLesson.document,version:2,content_schema_version:2};
const bundle = {lesson,chapter,subject,placement,topic,version,release:{data_kind:'sample'},course:null,outline:[{topic,lessons:[lesson]}]};
const catalogSql = require('node:fs').readFileSync('supabase/migrations/202609080001_academic_onboarding.sql','utf8');
const catalog = {version:'starter-2026-27-v1',academic_year:'2026-27',config:JSON.parse(catalogSql.split('$catalog$')[1])};
const base = 'http://127.0.0.1:5173';
const output = path.resolve('docs/visual-qa');
const profile = { id: '11111111-1111-4111-8111-111111111111', display_name: 'Aryan', class_level: 12, board: 'cbse', stream: 'science', subject_combination: 'pcm', study_goals: [], daily_study_target: 30, avatar_url: null, onboarding_completed: true, subjects: [{subject_key:'physics'}, {subject_key:'chemistry'}, {subject_key:'mathematics'}], competitive_goals: [], learning_preference:'balanced' };
const session = { user: { id: profile.id, email: 'student@example.test', user_metadata: {display_name:'Aryan'}, app_metadata: {} }, access_token: 'visual-fixture-only', refresh_token: 'visual-fixture-only', expires_at: 9999999999 };
const ready = data => ({status:'ready',data});
const dashboard = {
  subjects: ready([{id:'physics',name:'Physics',currentChapter:'Electric charges and fields'}, {id:'chemistry',name:'Chemistry',currentChapter:'Solutions'}, {id:'mathematics',name:'Mathematics',currentChapter:'Relations and functions'}]),
  continueLearning: ready({subjectName:'Physics',chapterName:'Electric charges and fields',lessonName:'Understanding the electric field',lessonId:'fixture-lesson',percentRead:38}),
  exams: ready([{key:'jee',shortName:'JEE'}]),
  revision: {status:'empty'}, practice:{status:'empty'},
  progress: ready({lessonsCompleted:12,practiceAccuracy:78,studyMinutes:246}),
  today: ready({streak:4,focusMinutesToday:25,tasks:[{id:'a',title:'Review electric field lines',done:false,type:'study'},{id:'b',title:'Practice integration',done:true,type:'practice'}]}),
  recommendations: ready([{id:'a',title:'Revisit Coulomb’s law',reason:'Build confidence before your next chapter.',targetRoute:'/app/revision',actionLabel:'Review concept'}]),
  weakTopics:{status:'empty'},recentActivity:ready(['Studied electric charges and fields','Completed a 25-minute focus session']),
};
async function setup(context, signedIn, onboarded = true) {
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(url.pathname.includes('/auth/')?{user:session.user}:url.pathname.endsWith('/user_roles')?[{role:'admin'}]:url.pathname.endsWith('/profiles')?[profile]:[])});
    }
    const js = body => route.fulfill({contentType:'application/javascript',body});
    if (url.pathname === '/src/features/auth/auth-service.ts') return js(`export const authService={restoreSession:async()=>(${JSON.stringify(signedIn?session:null)}),subscribe:()=>()=>{},signOut:async()=>{}}`);
    if (url.pathname === '/src/features/profile/profile-service.ts') return js(`export const profileService={getProfile:async()=>(${JSON.stringify({...profile,onboarding_completed:onboarded})}),getCatalog:async()=>(${JSON.stringify(catalog)})}`);
    if (url.pathname === '/src/features/dashboard/useDashboardData.ts') return js(`export const useDashboardData=()=>({data:${JSON.stringify(dashboard)},loading:false,refresh:async()=>{}})`);
    if (url.pathname === '/src/features/curriculum/repository.ts') return js(`export class AcademicUnavailableError extends Error {}; export const curriculumRepository={resolveMyCurriculum:async()=>({subjects:[${JSON.stringify(placement)}]}),getChapters:async()=>[${JSON.stringify(chapter)}],getSubject:async()=> (${JSON.stringify(subject)}),getOutline:async()=> (${JSON.stringify(bundle.outline)}),getReader:async()=> (${JSON.stringify(bundle)}),getLatestContent:async()=> (${JSON.stringify(version)}),getAsset:async()=>null};`);
    return route.continue();
  });
}
async function main() {
  await fs.mkdir(output,{recursive:true});
  const browser = await chromium.launch({channel:'chrome',headless:true,args:['--renderer-process-limit=2']});
  const report = [];
  const routes = process.env.QA_ROUTES?.split(',') || ['/welcome','/login','/app/dashboard','/app/settings','/app/focus','/dev/design-system'];
  const widths = (process.env.QA_WIDTHS || '390,1440').split(',').map(Number);
  try {
  for (const width of widths) {
    for (const target of routes) {
      const context = await browser.newContext({viewport:{width,height:960},colorScheme:'dark',reducedMotion:'reduce'});
      await setup(context,target.startsWith('/app')||target.startsWith('/dev')||target.startsWith('/admin')||target.startsWith('/onboarding'),target !== '/onboarding');
      const page = await context.newPage();
      const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
      await page.goto(base+target,{waitUntil:'networkidle'});
      await page.locator('h1').first().waitFor({state:'visible'});
      console.log('Captured',target,width);
      if (process.env.QA_SCREENSHOTS !== 'false') await page.screenshot({path:path.join(output,`${target.replaceAll('/','-').slice(1)}-${width}.png`),fullPage:true});
      report.push({target,width,url:page.url(),errors,...await page.evaluate(()=>({title:document.title,heading:document.querySelector('h1')?.textContent,overflow:document.documentElement.scrollWidth>innerWidth,offenders:[...document.querySelectorAll('main *')].filter(el=>el.getBoundingClientRect().right>innerWidth+1).slice(0,6).map(el=>el.className)}))});
      await fs.writeFile(path.join(output,process.env.QA_REPORT || 'report.json'),JSON.stringify(report,null,2));
      await context.close();
    }
  }
  } finally { await browser.close(); }
  await fs.writeFile(path.join(output,process.env.QA_REPORT || 'report.json'),JSON.stringify(report,null,2));
  const failures=report.filter(r=>r.errors.length||r.overflow);
  console.log(JSON.stringify({screens:report.length,failures},null,2));
  if(failures.length)process.exitCode=1;
}
module.exports = { setup, base, output, chromium };
if (require.main === module) main().catch(error=>{console.error(error);process.exitCode=1});
