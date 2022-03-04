exports.up = async knex => {
  // -> If the content is old then update it wil empty string and make isApproved and isReviewed for old data
  await knex('pageHistory').where('newContent', null).update({ newContent: '' })
  await knex('pageHistory').where('isApproved', false).update({ isApproved: true })
  await knex('pageHistory').where('isReviewed', false).update({ isReviewed: true })
}

exports.down = knex => { }
