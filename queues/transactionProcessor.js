const { Telegram, Extra } = require('telegraf')
const { promisify } = require('util')
const config = require('../config')
const i18n = require('../i18n')
const AddressRepository = require('../repositories/address')
const UserRepository = require('../repositories/user')
const formatAddress = require('../utils/formatAddress')

const timeout = promisify(setTimeout)

const telegram = new Telegram(config.get('bot.token'))

const addressRepository = new AddressRepository()
const userRepository = new UserRepository()

module.exports = async (job, done) => {
  const transaction = job.data
  const addresses = await addressRepository.getByAddress(
    [transaction.from, transaction.to],
    { is_deleted: false },
  )

  for (const { address, tag, user_id: userId } of addresses) {
    const fromTag =
      address === transaction.from && tag
        ? tag
        : formatAddress(transaction.from)
    const toTag =
      address === transaction.to && tag ? tag : formatAddress(transaction.to)

    const user = await userRepository.getByTgId(userId)

    if (user.is_blocked || user.is_deactivated) {
      return false
    }

    await telegram.sendMessage(
      userId,
      i18n.t(user.language, 'transaction', {
        from: transaction.from,
        to: transaction.to,
        from_tag: fromTag,
        to_tag: toTag,
        value: transaction.value,
      }),
      Extra.HTML(),
    )

    await timeout(200)
  }

  done()
}
