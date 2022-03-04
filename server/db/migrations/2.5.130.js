exports.up = async knex => {
  await knex.schema
    .alterTable('pageTree', table => {
      table.boolean('isPublished').notNullable().defaultTo(true)
      table.integer('creatorId')
    })
}

exports.down = knex => { }
