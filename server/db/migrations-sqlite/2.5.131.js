exports.up = async knex => {
  await knex.schema
    .alterTable('pages', table => {
      table.boolean('isSubmit').notNullable().defaultTo(false)
    })
}

exports.down = knex => { }
