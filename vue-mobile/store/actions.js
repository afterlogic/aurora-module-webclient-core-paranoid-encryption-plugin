import paranoidEncryptionWebApi from '../paranoid-encryption-web-api'

export default {
  asyncChangeParanoidEncryptionSettings: async ({}, parameters) => {
    return await paranoidEncryptionWebApi.setParanoidEncryptionSettings(
      parameters
    )
  },
  asyncCreatePublicLink: async ({}, parameters) => {
    return await paranoidEncryptionWebApi.createPublicLink(parameters)
  }
}
