'use strict'

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
])

const OPEN_TAG_RE = /<([a-zA-Z][\w:-]*)\b([^>]*?)(\/?)>/g

function getAttr (openAttrs, name) {
  const re = new RegExp('\\b' + name + '\\s*=\\s*(["\'])([^"\']*)\\1', 'i')
  const m = openAttrs.match(re)
  return m ? m[2] : null
}

function classList (openAttrs) {
  const cls = getAttr(openAttrs, 'class')
  return cls ? cls.split(/\s+/).filter(Boolean) : []
}

function matchesCssSelector (tagName, openAttrs, selector) {
  if (typeof selector !== 'string') return false
  const sel = selector.trim()
  const dz = sel.match(/^\[data-zone\s*=\s*["']([^"']+)["']\]$/i)
  if (dz) return getAttr(openAttrs, 'data-zone') === dz[1]
  if (sel.startsWith('.')) {
    return classList(openAttrs).includes(sel.slice(1))
  }
  const tc = sel.match(/^([a-zA-Z][\w-]*)\.([\w-]+)$/)
  if (tc) {
    return tagName.toLowerCase() === tc[1].toLowerCase() && classList(openAttrs).includes(tc[2])
  }
  return tagName.toLowerCase() === sel.toLowerCase()
}

function isSelfClosing (tagName, openTagText) {
  if (/\/>\s*$/.test(openTagText)) return true
  return VOID_ELEMENTS.has(tagName.toLowerCase())
}

function findElementEnd (html, startIndex, tagName) {
  const lower = tagName.toLowerCase()
  const openMatch = /^<([a-zA-Z][\w:-]*)\b([^>]*?)(\/?)>/i.exec(html.slice(startIndex))
  if (!openMatch) return html.length
  const openLen = openMatch[0].length
  if (isSelfClosing(openMatch[1], openMatch[0])) return startIndex + openLen

  let depth = 1
  let pos = startIndex + openLen
  while (pos < html.length && depth > 0) {
    const rest = html.slice(pos)
    const nextOpen = /^<([a-zA-Z][\w:-]*)\b([^>]*?)(\/?)>/i.exec(rest)
    const nextClose = /^<\/([a-zA-Z][\w:-]*)\s*>/i.exec(rest)
    const openAt = nextOpen ? nextOpen.index : -1
    const closeAt = nextClose ? nextClose.index : -1

    if (nextOpen && openAt === 0 && closeAt !== 0) {
      if (!isSelfClosing(nextOpen[1], nextOpen[0]) && nextOpen[1].toLowerCase() === lower) depth += 1
      pos += nextOpen[0].length
      continue
    }
    if (nextClose && closeAt === 0) {
      if (nextClose[1].toLowerCase() === lower) depth -= 1
      pos += nextClose[0].length
      continue
    }
    pos += 1
  }
  return pos
}

function collectMatchingElements (html, selectors) {
  const list = Array.isArray(selectors) ? selectors : [selectors]
  const hits = []
  const re = new RegExp(OPEN_TAG_RE.source, 'gi')
  let m
  while ((m = re.exec(html)) !== null) {
    const tagName = m[1]
    const attrs = m[2]
    const openTag = m[0]
    if (isSelfClosing(tagName, openTag)) continue
    if (!list.some((sel) => matchesCssSelector(tagName, attrs, sel))) continue
    const start = m.index
    const end = findElementEnd(html, start, tagName)
    hits.push({ start, end, openLen: openTag.length, tagName, openTag })
    if (end > re.lastIndex) re.lastIndex = end
  }
  return hits
}

function innerContentBounds (html, start, end) {
  const openMatch = /^<([a-zA-Z][\w:-]*)\b([^>]*?)(\/?)>/i.exec(html.slice(start))
  if (!openMatch) return null
  const innerStart = start + openMatch[0].length
  const closeMatch = /<\/([a-zA-Z][\w:-]*)\s*>$/i.exec(html.slice(start, end))
  if (!closeMatch) return null
  const innerEnd = end - closeMatch[0].length
  if (innerEnd < innerStart) return null
  return { innerStart, innerEnd, tagName: openMatch[1] }
}

module.exports = {
  collectMatchingElements,
  findElementEnd,
  innerContentBounds,
  classList,
  getAttr,
}
