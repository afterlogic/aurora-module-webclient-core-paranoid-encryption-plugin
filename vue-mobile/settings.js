// import typesUtils from 'src/utils/types'

class CoreParanoidEncryptionSettings {
  constructor (appData) {
    // const coreParanoidEncryptionWebclientPluginData = typesUtils.pObject(appData.CoreParanoidEncryptionWebclientPlugin)
  }
}

let settings = null

export default {
  init (appData) {
    settings = new CoreParanoidEncryptionSettings(appData)
  },
}

const getCoreParanoidEncryptionSettings = () => {
  return settings
}

export { getCoreParanoidEncryptionSettings }
