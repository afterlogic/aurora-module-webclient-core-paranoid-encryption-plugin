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
const { prepareOwnKeysForGenerate, cleanupOwnKeysInContacts } = moduleHelper(
  'OpenPgpWebclient',
  'openpgp-contacts'
)

// Passphrase for the OpenPGP key the test generates; empty = a key without a passphrase.
// Private keys live only in localStorage, so every test context starts without one.
const openPgpPassword = process.env.E2E_OPENPGP_PASSWORD || ''

async function startUploadViaFab(page, uniqueName) {
  await openNewItemsMenu(page)
  // Not .first(): the Paranoid settings tab keeps its hidden "Import key" input
  // (#import-key-file) in the DOM, and a file set there is read as a key.
  const fileInput = page
    .locator('input[type="file"]:not(#import-key-file)')
    .first()
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
      popup.locator('.button').filter({ hasText: /cancel|close/i }).first()
    ).catch(() => undefined)
    return true
  }
  await password.fill(openPgpPassword)
  await clickReady(
    popup.locator('.button').filter({ hasText: /generate/i }).first()
  )
  await expect(popup).toBeHidden({ timeout: T(120000) })
  return true
}

/** OpenPGP passphrase popup during encrypt upload. */
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
      .filter({ hasText: /^(ok|enter)$/i })
      .first()
  )
  await expect(keyPopup).toBeHidden({ timeout: T(60000) }).catch(() => undefined)
  return true
}

function discardChangesPopup(page) {
  return page.locator('.popup:visible').filter({
    hasText: /discard unsaved/i,
  })
}

async function dismissDiscardChanges(page) {
  const popup = discardChangesPopup(page)
  if (!(await popup.isVisible().catch(() => false))) {
    return false
  }
  // Cancel keeps the form open so we can Save; Ok would drop the toggles.
  await clickReady(
    popup.locator('.button').filter({ hasText: /cancel/i }).first()
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
        .filter({ hasNotText: /saving|in progress/i })
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

async function ensureCheckbox(page, { inputId, labelPattern, checked }) {
  const input = page.locator(`#${inputId}`)
  await expect(input).toBeAttached({ timeout: T(15000) })
  if ((await input.isChecked().catch(() => false)) === checked) {
    return false
  }
  const label = page.locator(`label[for="${inputId}"]`).or(
    page.getByText(labelPattern).first()
  )
  await clickReady(label.first())
  return true
}

function ensureCheckboxOn(page, options) {
  return ensureCheckbox(page, { ...options, checked: true })
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

/**
 * The test saves Paranoid settings on the shared test account, and they stay
 * there: afterwards every upload to Personal storage in any other module's test
 * opens the Encrypt / Do not Encrypt dialog. Put the account back to the
 * default (both options off). Best effort: cleanup must not fail the test.
 */
async function restoreParanoidDefaults(page) {
  try {
    const tab = await openParanoidTab(page)
    if (!tab) {
      return
    }
    const turnedOff = [
      await ensureCheckbox(page, {
        inputId: 'enableInPersonalStorage',
        labelPattern: /allow encrypting files in personal storage/i,
        checked: false,
      }).catch(() => false),
      await ensureCheckbox(page, {
        inputId: 'enableJscrypto',
        labelPattern: /enable paranoid encryption/i,
        checked: false,
      }),
    ]
    if (turnedOff.some(Boolean)) {
      await saveParanoidSettings(page)
    }
  } catch (err) {
    console.log(`  → Could not restore Paranoid settings: ${err.message}`)
  }
}

test.describe('Desktop Paranoid Encryption files', () => {
  test.skip(!hasCredentials(), 'Set E2E_LOGIN_PRIMARY in .env.e2e')

  // Leave no own public key in contacts, whatever the test did or where it failed.
  test.afterEach(async ({ page }) => {
    await cleanupOwnKeysInContacts(page)
    await restoreParanoidDefaults(page)
  })

  test('uploads file with client-side encryption enabled', async ({ page }) => {
    test.setTimeout(T(360000))
    const uniqueName = `e2e-paranoid-${Date.now()}.txt`

    await gotoLoggedIn(page)
    await prepareOwnKeysForGenerate(page)

    await step('Ensure OpenPGP keypair exists', async () => {
      const ok = await ensureOpenPgpKeys(page)
      test.skip(!ok, 'OpenPGP settings tab is not available on this stand')
      await attachScreenshot(page, 'paranoid-files-00-openpgp')
    })

    const paranoidTab = await openParanoidTab(page)
    test.skip(!paranoidTab, 'Paranoid Encryption tab is not available on this stand')

    await step('Enable Paranoid Encryption in settings', async () => {
      const pgpWarning = paranoidPanel(page).locator('.hint.yellow-warning')
      // The tab checks for the private key once, on show, and the warning starts
      // hidden. Right after Generate the key may not be stored yet, so that single
      // check reports it missing for good: let the check finish, and re-open the
      // tab (via the OpenPGP one) to run it again before treating it as a stand gate.
      let keyMissing = true
      for (let attempt = 0; attempt < 6 && keyMissing; attempt++) {
        await page.waitForTimeout(3000)
        keyMissing = await pgpWarning.isVisible().catch(() => false)
        if (keyMissing) {
          await clickReady(
            page
              .getByTestId('settings-tab')
              .filter({ hasText: /openpgp|open.?pgp/i })
              .first()
          )
          await openParanoidTab(page)
        }
      }
      test.skip(
        keyMissing,
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
            // The OpenPGP passphrase prompt may appear after Encrypt. Upload wraps a
            // fresh per-file AES key with OpenPGP; the legacy Paranoid key password
            // (DecryptKeyPasswordPopup) is only used for downloading old-format files.
            await submitAnyKeyPassword(page, openPgpPassword)

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
              /encrypt|pgp|key|https/i.test(errText)
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
      // A file that silently went up in clear text must not pass as encrypted.
      await expect(item.locator('.file_encrypted_icon')).toHaveCount(1, {
        timeout: T(30000),
      })
      await attachScreenshot(page, 'paranoid-files-02-uploaded')
    })

    await step('Cleanup: delete uploaded file', async () => {
      await confirmOkIfVisible(page, 5000)
      await openFileByName(page, uniqueName)
      await deleteOpenedFile(page, uniqueName)
    })
  })
})
