import types from 'src/utils/types'

class CoreParanoidEncryptionSettings {
  constructor (appData) {
    const paranoidEncryptionData = types.pObject(appData.CoreParanoidEncryptionWebclientPlugin)
    console.log(paranoidEncryptionData, 'paranoidEncryptionData')
    this.allowChangeSettings = types.pBool(paranoidEncryptionData.AllowChangeSettings)
    this.allowMultiChunkUpload = types.pBool(paranoidEncryptionData.AllowMultiChunkUpload)
    this.chunkSizeMb = types.pInt(paranoidEncryptionData.ChunkSizeMb)
    this.dontRemindMe = types.pBool(paranoidEncryptionData.DontRemindMe)
    this.enableInPersonalStorage = types.pBool(paranoidEncryptionData.EnableInPersonalStorage)
    this.enableModule = types.pBool(paranoidEncryptionData.EnableModule)
    this.encryptionMode = types.pInt(paranoidEncryptionData.EncryptionMode)
    this.enableParanoidEncryption = types.pBool(paranoidEncryptionData.EnableParanoidEncryption)
    this.chunkSize = types.pInt(paranoidEncryptionData.ChunkSizeMb)
  }
}

let settings = null

export default {
  init (appData) {
    console.log('init settings')
    settings = new CoreParanoidEncryptionSettings(appData)
  },
}

const getCoreParanoidEncryptionSettings = () => {
  console.log('getSettings')
  return settings
}

const setCoreParanoidEncryptionSettings = (enableModule, enableInPersonalStorage) => {
  settings.enableModule = enableModule
  settings.enableInPersonalStorage = enableInPersonalStorage
}

export { getCoreParanoidEncryptionSettings, setCoreParanoidEncryptionSettings }
