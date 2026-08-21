import webApi from 'src/api/web-api'
import modulesManager from 'src/modules-manager'

const OPGP_FILES_MODULE = 'OpenPgpFilesWebclient'

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
    if (!modulesManager.isModuleAvailable(OPGP_FILES_MODULE)) {
      return false
    }
    return webApi.sendRequest({
      moduleName: OPGP_FILES_MODULE,
      methodName: 'CreatePublicLink',
      parameters: parameters,
    })
      .then(result => result)
      .catch(error => false)
  },
}
