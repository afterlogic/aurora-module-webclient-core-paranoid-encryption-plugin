import webApi from 'src/api/web-api'

export default {
  setParanoidEncryptionSettings: async (parameters) => {
    return webApi.sendRequest({
      moduleName: 'CoreParanoidEncryptionWebclientPlugin',
      methodName: 'UpdateSettings',
      parameters: parameters,
    })
      .then(result => result)
      .catch(error => false)
  },

  createPublicLink: async (parameters) => {
    return webApi.sendRequest({
      moduleName: 'OpenPgpFilesWebclient',
      methodName: 'CreatePublicLink',
      parameters: parameters,
    })
      .then(result => result)
      .catch(error => false)
  },
}
