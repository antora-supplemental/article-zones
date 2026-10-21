'use strict'

const { relocateArticleChrome } = require('./relocate-chrome')

/**
 * Antora extension: after UI compose, relocate semantic chrome from the body zone
 * into header/meta/footer zones declared by the theme (`article.hbs` contract).
 */
function register (context = {}) {
  if (context.config && context.config.skip) return
  const logger = this.getLogger('@antora-supplemental/article-zones')

  this.on('pagesComposed', ({ contentCatalog }) => {
    let moved = 0
    for (const page of contentCatalog.getPages((p) => p.out)) {
      const before = page.contents.toString()
      const after = relocateArticleChrome(before)
      if (after === before) continue
      page.contents = Buffer.from(after)
      moved++
    }
    if (moved) logger.info(`Relocated page-context lead into meta zone on ${moved} page(s)`)
  })
}

module.exports = register
module.exports.register = register
module.exports._internal = { relocateArticleChrome }
