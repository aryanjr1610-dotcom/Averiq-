import type { AnatomyStructure } from '../model'

export type StructureGroup = 'Chambers' | 'Valves' | 'Great vessels' | 'Brain regions' | 'Structures'
export type DiagramPart = { d: string; tone: 'venous' | 'arterial' | 'valve' | 'neural'; anchor: [number, number]; label: [number, number]; shortName?: string }

// Original cutaway illustrations. Coordinates are pedagogical, not patient geometry.
export const HEART_PARTS: Record<string, DiagramPart> = {
  vc: { d: 'M190 96 L221 96 L223 203 Q231 225 235 257 L212 282 L183 265 Q200 218 193 183 Z M198 285 L229 294 L224 391 L193 396 Z', tone: 'venous', anchor: [202, 139], label: [34, 105], shortName: 'Venae cavae' },
  aorta: { d: 'M329 290 C312 249 289 199 290 139 C290 90 320 64 356 72 C394 80 406 117 405 151 L379 163 C382 127 372 104 354 102 C336 99 325 113 325 139 C325 186 350 232 357 272 Z M323 84 L321 51 L335 47 L341 76 Z M347 75 L352 39 L367 41 L365 80 Z M372 84 L386 55 L399 63 L386 96 Z', tone: 'arterial', anchor: [352, 92], label: [468, 57] },
  pv: { d: 'M369 193 L441 172 L450 190 L381 217 Z M380 222 L451 211 L455 232 L384 247 Z M316 185 L267 170 L261 190 L319 210 Z M315 214 L267 205 L263 223 L321 237 Z', tone: 'arterial', anchor: [431, 219], label: [468, 191], shortName: 'Pulmonary veins' },
  pa: { d: 'M275 278 C277 237 286 214 304 188 C311 176 309 159 297 151 L249 135 L257 112 L304 128 C315 132 324 143 329 154 L381 134 L391 157 L337 180 C330 219 304 235 307 279 Z', tone: 'venous', anchor: [287, 145], label: [34, 163] },
  ra: { d: 'M219 182 C190 179 170 203 169 238 C166 270 178 300 207 312 C225 314 245 297 255 277 L261 239 C259 210 244 187 219 182 Z', tone: 'venous', anchor: [200, 246], label: [34, 239] },
  la: { d: 'M340 185 C362 172 394 188 403 208 C415 230 410 256 390 271 L350 283 L325 257 C315 238 320 202 340 185 Z', tone: 'arterial', anchor: [369, 230], label: [468, 255] },
  rv: { d: 'M208 312 C223 321 244 311 268 284 L299 304 C276 348 285 413 325 464 C269 444 219 415 193 376 C177 352 184 324 208 312 Z', tone: 'venous', anchor: [231, 361], label: [34, 406] },
  lv: { d: 'M337 291 C357 290 379 280 394 277 C416 310 417 354 399 395 C385 428 360 450 345 467 C317 442 305 409 306 371 C307 338 321 309 337 291 Z', tone: 'arterial', anchor: [365, 364], label: [468, 416] },
  tricuspid: { d: 'M203 303 L220 295 L232 308 L245 288 L269 277 L268 293 L246 324 L231 319 L217 325 Z', tone: 'valve', anchor: [238, 310], label: [34, 324] },
  mitral: { d: 'M331 274 L352 278 L369 270 L390 264 L398 280 L370 304 L356 289 L338 302 Z', tone: 'valve', anchor: [377, 289], label: [468, 330], shortName: 'Mitral valve' },
}

export const BRAIN_PARTS: Record<string, DiagramPart> = {
  brainstem: { d: 'M331 300 C339 316 357 322 356 342 C355 361 342 379 347 400 L358 438 L338 444 L319 404 C310 384 311 367 303 349 L293 324 Z', tone: 'valve', anchor: [339, 396], label: [438, 435] },
  cerebellum: { d: 'M357 290 C387 282 423 295 434 321 C444 349 424 377 394 386 C370 393 346 379 341 358 C335 337 338 311 357 290 Z', tone: 'arterial', anchor: [401, 340], label: [462, 345] },
  cerebrum: { d: 'M170 273 C149 257 148 224 160 204 C151 184 161 158 183 150 C185 124 212 108 234 111 C251 88 279 89 299 95 C321 81 349 91 361 100 C389 95 411 112 419 132 C443 140 454 162 451 184 C471 207 465 235 451 251 C451 277 428 293 406 291 C391 305 369 302 353 294 C335 314 306 313 288 301 C269 311 246 305 235 290 C214 302 183 293 170 273 Z', tone: 'neural', anchor: [301, 166], label: [34, 117] },
}

export function structureGroup(organSlug: string, key: string): StructureGroup {
  if (organSlug === 'heart') {
    if (['ra', 'rv', 'la', 'lv'].includes(key)) return 'Chambers'
    if (['tricuspid', 'mitral'].includes(key)) return 'Valves'
    if (['aorta', 'vc', 'pa', 'pv'].includes(key)) return 'Great vessels'
  }
  if (organSlug === 'brain' && key in BRAIN_PARTS) return 'Brain regions'
  return 'Structures'
}

export function groupStructures(organSlug: string, structures: AnatomyStructure[]) {
  const groups = new Map<StructureGroup, AnatomyStructure[]>()
  for (const item of structures) {
    const group = structureGroup(organSlug, item.objectKey)
    groups.set(group, [...(groups.get(group) ?? []), item])
  }
  return [...groups].map(([name, items]) => ({ name, items }))
}
