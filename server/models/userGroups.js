const Model = require('objection').Model
const _ = require('lodash')

/* global WIKI */

/**
 * Pages model
 */
module.exports = class userGroups extends Model {
  static get tableName() { return 'userGroups' }

  static get jsonSchema () {
    return {
      type: 'object',
      required: [],

      properties: {
        id: {type: 'integer'},
        userId: {type: 'integer'},
        groupId: {type: 'integer'}

      }
    }
  }

  /**
   * Fetch an Group Users from the Database
   *
   * @param {Object} opts Page Properties
   * @returns {Promise} Promise of the Page Model Instance
   */
  static async getGroupUsersFromDb(opts) {
    try {
      return WIKI.models.userGroups.query()
        .where('groupId', opts)
    } catch (err) {
      WIKI.logger.warn(err)
      throw err
    }
  }
}
