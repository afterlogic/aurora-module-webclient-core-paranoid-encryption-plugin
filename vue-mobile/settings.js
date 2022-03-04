import types from 'src/utils/types'

class CoreParanoidEncryptionSettings {
  constructor (appData) {
    const paranoidEncryptionData = types.pObject(appData.CoreParanoidEncryptionWebclientPlugin)
    this.allowChangeSettings = types.pBool(paranoidEncryptionData.AllowChangeSettings)
    this.allowMultiChunkUpload = types.pBool(paranoidEncryptionData.AllowMultiChunkUpload)
    this.chunkSizeMb = types.pInt(paranoidEncryptionData.ChunkSizeMb)
    this.dontRemindMe = types.pBool(paranoidEncryptionData.DontRemindMe)
    this.enableInPersonalStorage = types.pBool(paranoidEncryptionData.EnableInPersonalStorage)
    this.enableModule = types.pBool(paranoidEncryptionData.EnableModule)
    this.encryptionMode = types.pInt(paranoidEncryptionData.EncryptionMode)
    this.enableParanoidEncryption = types.pBool(paranoidEncryptionData.EnableModule)
    this.chunkSize = types.pInt(paranoidEncryptionData.ChunkSizeMb)
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

const setCoreParanoidEncryptionSettings = (enableModule, enableInPersonalStorage) => {
  settings.enableModule = enableModule
  settings.enableInPersonalStorage = enableInPersonalStorage
}

export { getCoreParanoidEncryptionSettings, setCoreParanoidEncryptionSettings }
