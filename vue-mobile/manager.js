import _ from 'lodash'

import eventBus from 'src/event-bus'

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

const _getSettingsHeaderTitles = params => {
  if (!_.isArray(params.settingsHeaderTitles)) {
    params.settingsHeaderTitles = []
  }
  params.settingsHeaderTitles = params.settingsHeaderTitles.concat([
    {
      settingsPath: '/settings/paranoid-encryption',
      settingsTitle: 'Paranoid Encryption',
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
    eventBus.$off('SettingsMobileWebclient::GetSettingsPageChildren', _getSettingsPageChildren)
    eventBus.$on('SettingsMobileWebclient::GetSettingsPageChildren', _getSettingsPageChildren)

    eventBus.$off('SettingsMobileWebclient::GetSettingsTabs', _getSettingsTabs)
    eventBus.$on('SettingsMobileWebclient::GetSettingsTabs', _getSettingsTabs)

    eventBus.$off('SettingsMobileWebclient::GetSettingsHeaderTitles', _getSettingsHeaderTitles)
    eventBus.$on('SettingsMobileWebclient::GetSettingsHeaderTitles', _getSettingsHeaderTitles)
  },
}
