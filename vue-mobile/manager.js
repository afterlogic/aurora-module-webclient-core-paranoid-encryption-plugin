import _ from 'lodash'

import EventBus from 'src/event-bus'

import settings from './settings'

const _getSettingsTabs = params => {
  if (!_.isArray(params.settingsTabs)) {
    params.settingsTabs = []
  }
  params.settingsTabs = params.settingsTabs.concat([
    {
      routerPath: '/settings/paranoid-encryption',
      tabNameLangConst: 'COREPARANOIDENCRYPTIONWEBCLIENTPLUGIN.LABEL_SETTINGS_TAB',
      getIconComponent: () => import('./components/icons/ParanoidIcon'),
    },
  ])
}

const _getSettingsPageChildren = params => {
  if (!_.isArray(params.settingsPageChildren)) {
    params.settingsPageChildren = []
  }
  params.settingsPageChildren = params.settingsPageChildren.concat([
    {
      path: '/settings/paranoid-encryption',
      component: () => import('./components/settings/ParanoidEncryption'),
    },
  ])
}

export default {
  moduleName: 'CoreParanoidEncryptionWebclientPlugin',

  requiredModules: [],

  init (appdata) {
    settings.init(appdata)
  },

  initSubscriptions (appData) {
    EventBus.$off('SettingsMobileWebclient::GetSettingsPageChildren', _getSettingsPageChildren)
    EventBus.$on('SettingsMobileWebclient::GetSettingsPageChildren', _getSettingsPageChildren)

    EventBus.$off('SettingsMobileWebclient::GetSettingsTabs', _getSettingsTabs)
    EventBus.$on('SettingsMobileWebclient::GetSettingsTabs', _getSettingsTabs)
  },
}
