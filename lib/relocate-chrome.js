'use strict'

const {
  collectMatchingElements,
  findElementEnd,
  innerContentBounds,
  classList,
  getAttr,
} = require('./html-range')

function zoneContainerHits (html, zone) {
  return collectMatchingElements(html, [`[data-zone="${zone}"]`]).filter((hit) => {
    const open = /^<([a-zA-Z][\w:-]*)\b([^>]*)>/i.exec(html.slice(hit.start))
    if (!open) return false
    return open[1].toLowerCase() === 'div' && getAttr(open[2], 'data-zone') === zone
  })
}

/** Semantic chrome relocated from `[data-zone="body"]` into `[data-zone="meta"]`. */
const LEAD_ASIDE_CLASS = 'page-context-lead'

function stripLeadingStyleBlocks (html) {
  let prefix = ''
  let rest = html
  while (true) {
    const m = /^\s*<style\b[^>]*>[\s\S]*?<\/style>\s*/i.exec(rest)
    if (!m) break
    prefix += m[0]
    rest = rest.slice(m[0].length)
  }
  return { prefix, rest }
}

function isLeadPageContextAside (openTagSlice) {
  const m = /^<aside\b([^>]*)>/i.exec(openTagSlice)
  if (!m) return false
  const classes = classList(m[1])
  return classes.includes('page-context') && classes.includes(LEAD_ASIDE_CLASS)
}

/**
 * When the theme segments the article, move leading page-context lead asides from
 * the body zone into the meta zone (pipeline segmentation — not linkinator excludes).
 *
 * @param {string} html
 * @returns {string}
 */
function relocateArticleChrome (html) {
  if (!html || typeof html !== 'string') return html
  if (!/data-zone\s*=\s*["']body["']/i.test(html)) return html

  const bodies = zoneContainerHits(html, 'body')
  if (!bodies.length) return html
  if (!zoneContainerHits(html, 'meta').length) return html

  let result = html
  const body = bodies[0]
  const bodyBounds = innerContentBounds(result, body.start, body.end)
  if (!bodyBounds) return result

  const bodyInner = result.slice(bodyBounds.innerStart, bodyBounds.innerEnd)
  const { prefix, rest } = stripLeadingStyleBlocks(bodyInner)
  const asideOpen = /^(\s*)<aside\b/i.exec(rest)
  if (!asideOpen || !isLeadPageContextAside(rest.slice(asideOpen.index))) return result

  const asideStartInRest = asideOpen.index
  const asideStart = bodyBounds.innerStart + prefix.length + asideStartInRest
  const asideEnd = findElementEnd(result, asideStart, 'aside')
  const asideHtml = result.slice(asideStart, asideEnd)
  const afterAside = rest.slice(asideStartInRest + (asideEnd - asideStart))

  const newBodyInner = prefix + afterAside.replace(/^\s*/, asideOpen[1] || '')
  result = result.slice(0, bodyBounds.innerStart) + newBodyInner + result.slice(bodyBounds.innerEnd)

  const metasAfter = zoneContainerHits(result, 'meta')
  if (!metasAfter.length) return result
  const metaBounds = innerContentBounds(result, metasAfter[0].start, metasAfter[0].end)
  if (!metaBounds) return result
  const metaInner = result.slice(metaBounds.innerStart, metaBounds.innerEnd)
  const newMetaInner = metaInner.trim() ? asideHtml + metaInner : asideHtml
  return result.slice(0, metaBounds.innerStart) + newMetaInner + result.slice(metaBounds.innerEnd)
}

module.exports = {
  relocateArticleChrome,
  LEAD_ASIDE_CLASS,
}
