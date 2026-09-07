const path = require('path')
const fs = require('fs')
const { sharedHelper, moduleHelper } = require(path.join(
  process.env.AURORA_E2E_ROOT,
  'helpers/paths'
))
const { test, expect } = require('@playwright/test')
const { T } = sharedHelper('timeouts')
const { gotoLoggedIn, step, attachScreenshot, hasCredentials } = sharedHelper('login')
const { clickReady, confirmOkIfVisible } = sharedHelper('ready')
const { openSettings, openPgpPanel } = moduleHelper('SettingsWebclient', 'settings')
const {
  openPersonalStorage,
  openNewItemsMenu,
  filesItemByName,
  fixturePath,
  waitForListReady,
  listReadyOptions,
  openFileByName,
  deleteOpenedFile,
} = moduleHelper('FilesWebclient', 'files')

const paranoidPassword = process.env.E2E_PARANOID_PASSWORD || 'e2e-paranoid-test'
const openPgpPassword = process.env.E2E_OPENPGP_PASSWORD || ''

async function startUploadViaFab(page, uniqueName) {
  await openNewItemsMenu(page)
  const fileInput = page.locator('input[type="file"]').first()
  const buffer = fs.readFileSync(fixturePath)
  if ((await fileInput.count()) > 0) {
    await fileInput.setInputFiles({
      name: uniqueName,
      mimeType: 'text/plain',
      buffer,
    })
  } else {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      clickReady(page.getByTestId('files-upload')),
    ])
    await fileChooser.setFiles({
      name: uniqueName,
      mimeType: 'text/plain',
      buffer,
    })
  }
}

/**
 * Paranoid wraps the AES key with the user's OpenPGP keypair (CCrypto.startUpload).
 * Without a private+public key the upload is cancelled and no list item appears.
 */
async function ensureOpenPgpKeys(page) {
  await openSettings(page)
  const tab = page
    .getByTestId('settings-tab')
    .filter({ hasText: /openpgp|open.?pgp/i })
  if ((await tab.count()) === 0) {
    return false
  }
  await clickReady(tab.first())
  // Prefer .panel_center — settings tab middle_bar also uses settings-openpgp.
  const panel = openPgpPanel(page)
  await expect(panel).toBeVisible({ timeout: T(30000) })

  const generate = page.getByTestId('settings-openpgp-generate')
  if (!(await generate.isVisible().catch(() => false))) {
    return true
  }
  await clickReady(generate)
  const popup = page.locator('.popup:visible').filter({
    hasText: /generate|key/i,
  })
  const visible = await popup
    .waitFor({ state: 'visible', timeout: T(10000) })
    .then(() => true)
    .catch(() => false)
  if (!visible) {
    return true
  }
  // Keys already present → popup shows "keys exist", Generate disabled.
  const password = popup.locator('input[type="password"]')
  if (!(await password.isVisible().catch(() => false))) {
    await clickReady(
      popup.locator('.button').filter({ hasText: /cancel|отмен|close|закры/i }).first()
    ).catch(() => undefined)
    return true
  }
  await password.fill(openPgpPassword)
  await clickReady(
    popup.locator('.button').filter({ hasText: /generate|сгенер/i }).first()
  )
  await expect(popup).toBeHidden({ timeout: T(120000) })
  return true
}

/** OpenPGP passphrase and/or Paranoid key-password popups during encrypt upload. */
async function submitAnyKeyPassword(page, password) {
  const keyPopup = page
    .locator('.popup:visible')
    .filter({ has: page.locator('input[type="password"]') })
    .first()
  if (!(await keyPopup.isVisible().catch(() => false))) {
    return false
  }
  const inputs = keyPopup.locator('input[type="password"]')
  const count = await inputs.count()
  for (let i = 0; i < count; i++) {
    await inputs.nth(i).fill(password)
  }
  await clickReady(
    keyPopup
      .locator('.button')
      .filter({ hasText: /^(ok|enter|ок)$/i })
      .first()
  )
  await expect(keyPopup).toBeHidden({ timeout: T(60000) }).catch(() => undefined)
  return true
}

function discardChangesPopup(page) {
  return page.locator('.popup:visible').filter({
    hasText: /discard unsaved|несохран/i,
  })
}

async function dismissDiscardChanges(page) {
  const popup = discardChangesPopup(page)
  if (!(await popup.isVisible().catch(() => false))) {
    return false
  }
  // Cancel keeps the form open so we can Save; Ok would drop the toggles.
  await clickReady(
    popup.locator('.button').filter({ hasText: /cancel|отмен/i }).first()
  )
  await expect(popup).toBeHidden({ timeout: T(15000) })
  return true
}

function paranoidPanel(page) {
  return page.locator('.panel_center[data-test-id="settings-paranoid"]').first()
}

function paranoidSaveButton(page) {
  // Prefer test-id (nested i18n <span> breaks /^save$/ hasText on the outer .button).
  return page
    .getByTestId('settings-paranoid-save')
    .or(
      paranoidPanel(page)
        .locator('.buttons')
        .first()
        .locator('.button')
        .filter({ hasNotText: /saving|in progress|сохранен/i })
        .first()
    )
    .first()
}

async function saveParanoidSettings(page) {
  await dismissDiscardChanges(page)
  const save = paranoidSaveButton(page)
  await expect(save).toBeVisible({ timeout: T(15000) })
  await clickReady(save)
  await expect(save).toBeVisible({ timeout: T(60000) })
  await confirmOkIfVisible(page, 3000)
}

async function ensureCheckboxOn(page, { inputId, labelPattern }) {
  const input = page.locator(`#${inputId}`)
  await expect(input).toBeAttached({ timeout: T(15000) })
  if (await input.isChecked().catch(() => false)) {
    return false
  }
  const label = page.locator(`label[for="${inputId}"]`).or(
    page.getByText(labelPattern).first()
  )
  await clickReady(label.first())
  return true
}

/**
 * Settings has an unsaved-changes guard: navigating to Files while dirty opens
 * "Discard unsaved changes?" and blocks the route — files-list never appears.
 */
async function leaveSettingsForFiles(page) {
  await expect
    .poll(
      async () => {
        if (await page.getByTestId('files-list').isVisible().catch(() => false)) {
          return true
        }
        await dismissDiscardChanges(page)
        if (await paranoidSaveButton(page).isVisible().catch(() => false)) {
          await saveParanoidSettings(page)
        }
        await clickReady(page.getByTestId('nav-files'))
        return page.getByTestId('files-list').isVisible().catch(() => false)
      },
      { timeout: T(90000), intervals: [500, 1000, 2000] }
    )
    .toBe(true)
}

async function openParanoidTab(page) {
  await openSettings(page)
  const paranoidTab = page
    .getByTestId('settings-tab')
    .filter({ hasText: /paranoid|encryption/i })
  if ((await paranoidTab.count()) === 0) {
    return null
  }
  await clickReady(paranoidTab.first())
  await expect(paranoidPanel(page)).toBeVisible({
    timeout: T(30000),
  })
  return paranoidTab
}

test.describe('Desktop Paranoid Encryption files', () => {
  test.skip(!hasCredentials(), 'Set E2E_LOGIN_PRIMARY in .env.e2e')

  test('uploads file with client-side encryption enabled', async ({ page }) => {
    test.setTimeout(T(360000))
    const uniqueName = `e2e-paranoid-${Date.now()}.txt`

    test.skip(
      !openPgpPassword,
      'Set E2E_OPENPGP_PASSWORD — Paranoid upload wraps the AES key with OpenPGP'
    )

    await gotoLoggedIn(page)

    await step('Ensure OpenPGP keypair exists', async () => {
      const ok = await ensureOpenPgpKeys(page)
      test.skip(!ok, 'OpenPGP settings tab is not available on this stand')
      await attachScreenshot(page, 'paranoid-files-00-openpgp')
    })

    const paranoidTab = await openParanoidTab(page)
    test.skip(!paranoidTab, 'Paranoid Encryption tab is not available on this stand')

    await step('Enable Paranoid Encryption in settings', async () => {
      const pgpWarning = paranoidPanel(page).locator('.hint.yellow-warning')
      // isPGPKeysAvailable() is async on tab show — wait before treating as a stand gate.
      await expect(pgpWarning)
        .toBeHidden({ timeout: T(30000) })
        .catch(() => undefined)
      test.skip(
        await pgpWarning.isVisible().catch(() => false),
        'OpenPGP private key still missing after generate (Paranoid cannot encrypt)'
      )

      await ensureCheckboxOn(page, {
        inputId: 'enableJscrypto',
        labelPattern: /enable paranoid encryption/i,
      })
      const personalInput = page.locator('#enableInPersonalStorage')
      if ((await personalInput.count()) > 0) {
        await ensureCheckboxOn(page, {
          inputId: 'enableInPersonalStorage',
          labelPattern: /allow encrypting files in personal storage/i,
        })
      }
      // Always Save — dirty settings block Files via discard dialog, and
      // EnableInPersonalStorage must be persisted for the encrypt popup.
      await saveParanoidSettings(page)
      await expect(page.locator('#enableJscrypto')).toBeChecked()
      if ((await personalInput.count()) > 0) {
        await expect(personalInput).toBeChecked()
      }
      await attachScreenshot(page, 'paranoid-files-01-settings')
    })

    await step('Upload and choose encrypt', async () => {
      await leaveSettingsForFiles(page)
      await openPersonalStorage(page)
      await startUploadViaFab(page, uniqueName)

      const encryptDialog = page.locator('.popup:visible').filter({
        has: page.getByTestId('files-upload-encrypt'),
      })
      const appeared = await encryptDialog
        .waitFor({ state: 'visible', timeout: T(30000) })
        .then(() => true)
        .catch(() => false)
      test.skip(
        !appeared,
        'Encrypt-on-upload dialog did not appear (Paranoid upload hook off on stand)'
      )
      await clickReady(page.getByTestId('files-upload-encrypt'))

      const item = filesItemByName(page, uniqueName)
      await expect
        .poll(
          async () => {
            // Passphrase may appear after Encrypt (OpenPGP); also handle Paranoid key UI.
            await submitAnyKeyPassword(page, openPgpPassword)
            await submitAnyKeyPassword(page, paranoidPassword)

            if (await item.isVisible().catch(() => false)) {
              return 'ok'
            }
            const errText = (
              await page
                .locator(
                  '.report.error:visible, .notifications .error:visible, .screen .error:visible'
                )
                .first()
                .innerText()
                .catch(() => '')
            ).trim()
            if (
              /encrypt|pgp|key|https|парол|ключ|шифр/i.test(errText)
            ) {
              return `error:${errText}`
            }
            return 'pending'
          },
          { timeout: T(180000), intervals: [1000, 2000, 3000, 5000] }
        )
        .toBe('ok')

      await waitForListReady(page, listReadyOptions)
      console.log(`  → Encrypted upload finished: ${uniqueName}`)
      await attachScreenshot(page, 'paranoid-files-02-uploaded')
    })

    await step('Cleanup: delete uploaded file', async () => {
      await confirmOkIfVisible(page, 5000)
      await openFileByName(page, uniqueName)
      await deleteOpenedFile(page, uniqueName)
    })
  })
})
