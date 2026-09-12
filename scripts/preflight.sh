# scripts/preflight.sh — fails the build if vibe-coded patterns come back
set -e
FAIL=0
check () { if rg -n --glob '!node_modules' "$1" src >/dev/null 2>&1; then
  echo "✗ $2"; rg -n --glob '!node_modules' "$1" src | head -8; FAIL=1; fi }

check 'from-purple|to-violet|via-fuchsia'            'AI-purple gradients'
check 'bg-gradient-to-\w+ from-\w+-500 to-\w+-500'   'saturated two-stop gradients'
check 'shadow-\[0_0_\d+px'                            'glow shadows'
check 'blur-3xl|blur-\[1[0-9]{2}px\]'                 'giant blur blobs'
check 'rounded-\[(2[4-9]|3[0-9])px\]|rounded-3xl'     'bubble radii (>26px)'
check 'duration-(300|500|700|1000)'                   'off-token durations'
check 'text-(slate|gray|zinc)-(400|500)'              'raw low-contrast grays'
check '#[0-9a-fA-F]{6}'                               'hardcoded hex outside tokens.css'
check 'hover:scale-1(0[5-9]|[1-9])'                   'card zoom on hover'
check 'animate-bounce|animate-ping'                   'decorative infinite loops'
check 'framer-motion.*whileHover=\{\{ *scale: *1\.[1-9]' 'oversized hover scale'
check '@heroicons|react-icons|@tabler/icons'          'second icon library'

echo "--- bundle guard ---"
node -e '
const p=require("./package.json"), d={...p.dependencies};
const anim=["gsap","animejs","react-spring","@react-spring/web","motion-one","lottie-react"];
const dupe=anim.filter(k=>d[k]);
if (d["framer-motion"] && dupe.length) { console.error("✗ duplicate animation libs:",dupe.join(", ")); process.exit(1); }
console.log("✓ single animation library");
'
[ $FAIL -eq 0 ] && echo "✓ pre-flight clean" || exit 1
