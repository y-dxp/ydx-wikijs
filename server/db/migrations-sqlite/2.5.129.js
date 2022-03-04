exports.up = async knex => {
  await knex.schema
    .alterTable('pageHistory', table => {
      table.text('newContent').defaultTo('')
      table.boolean('isApproved').notNullable().defaultTo(false)
      table.boolean('isReviewed').notNullable().defaultTo(false)
    })
}

exports.down = knex => { }
