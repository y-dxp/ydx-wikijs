exports.up = async knex => {
  await knex.schema
    .alterTable('pages', table => {
      table.boolean('isSubmit').notNullable().defaultTo(true)
    })
}

exports.down = knex => { }
