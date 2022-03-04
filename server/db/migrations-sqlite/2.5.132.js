exports.up = async knex => {
  await knex.schema
    .alterTable('pageTree', table => {
      table.boolean('isSubmit').notNullable().defaultTo(true)
    })
}

exports.down = knex => { }
