'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const ext = require('../lib/index.js')
const { relocateArticleChrome } = require('../lib/relocate-chrome.js')

const lead =
  '<aside class="page-context page-context-lead" data-zone="meta" role="note">' +
  '<p class="page-context-byline">Byline</p></aside>'

describe('article-zones relocate', () => {
  it('moves leading page-context-lead from body into meta', () => {
    const html =
      '<article class="doc" data-zone-root>' +
      '<header class="doc-zone doc-zone--header" data-zone="header"><h1>T</h1></header>' +
      '<div class="doc-zone doc-zone--meta" data-zone="meta"></div>' +
      '<div class="doc-zone doc-zone--body" data-zone="body">' +
      lead +
      '<p>Prose</p></div>' +
      '<footer class="doc-zone doc-zone--footer" data-zone="footer"></footer></article>'
    const out = relocateArticleChrome(html)
    const body = out.match(/<div[^>]*data-zone="body"[^>]*>([\s\S]*?)<\/div>\s*<footer/)?.[1] ?? ''
    const meta = out.match(/<div[^>]*data-zone="meta"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*data-zone="body"/)?.[1] ?? ''
    assert.match(body, /^<p>Prose<\/p>/)
    assert.doesNotMatch(body, /page-context-lead/)
    assert.match(meta, /page-context-lead/)
    assert.match(meta, /Byline/)
  })

  it('preserves leading page-context stylesheet in body', () => {
    const style = '<style type="text/css">.page-context{}</style>'
    const html =
      '<div data-zone="meta"></div>' +
      '<div data-zone="body">' +
      style +
      lead +
      '<p>x</p></div>'
    const out = relocateArticleChrome(html)
    const body = out.match(/<div data-zone="body">([\s\S]*?)<\/div>/)?.[1] ?? ''
    assert.match(body, /^<style/)
    assert.doesNotMatch(body, /page-context-lead/)
    assert.match(out, /data-zone="meta"[^>]*>[\s\S]*page-context-lead/)
  })

  it('no-ops without body zone', () => {
    const flat = '<article class="doc">' + lead + '<p>x</p></article>'
    assert.equal(relocateArticleChrome(flat), flat)
  })

  it('register hooks pagesComposed', () => {
    const handlers = {}
    const fake = { on (e, fn) { handlers[e] = fn }, getLogger () { return { info () {} } } }
    ext.register.call(fake, { config: {} })
    assert.equal(typeof handlers.pagesComposed, 'function')
  })
})
