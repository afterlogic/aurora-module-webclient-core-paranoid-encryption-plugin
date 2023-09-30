import paranoidEncryptionWebApi from '../paranoid-encryption-web-api'

export default {
  async asyncChangeParanoidEncryptionSettings(parameters) {
    return await paranoidEncryptionWebApi.setParanoidEncryptionSettings(
      parameters
    )
  },
  async asyncCreatePublicLink(parameters) {
    return await paranoidEncryptionWebApi.createPublicLink(parameters)
  }
}
