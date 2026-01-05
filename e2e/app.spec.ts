import { test, expect } from '@playwright/test';
import path from 'path';

test('Mercari AI Assistant E2E Flow', async ({ page }) => {
    // 1. Navigate
    await page.goto('/');
    // タイトルは "Create Next App" とかデフォルトのままかもしれないので、h1などをチェック
    await expect(page.locator('h1')).toContainText('新規作成');

    // 2. Upload Image
    const filePath = path.join(process.cwd(), 'public', 'sample-watch.png');
    // input[type="file"]はhiddenかもしれないので、attachedを待つか、直接setInputFilesを試みる
    await page.setInputFiles('input[type="file"]', filePath);

    // 3. Select Status
    await page.click('button#status');
    await page.getByRole('option', { name: "目立った傷や汚れなし" }).click();

    // 4. Start Analysis
    await page.getByRole('button', { name: "AIで分析を開始" }).click();

    // 5. Wait for Analysis (Preview page)
    // "出品プレビュー" というテキストが表示されるまで待つ (AI分析時間を考慮してtimeout長め)
    await expect(page.getByText('出品プレビュー')).toBeVisible({ timeout: 60000 });

    // 6. Verify Inputs
    const titleInput = page.getByPlaceholder('商品名を入力');
    await expect(titleInput).not.toBeEmpty();
    const title = await titleInput.inputValue();
    console.log('Generated Title:', title);

    // 7. Save
    await page.getByRole('button', { name: "保存する" }).click();

    // 8. Wait for History Page
    // URLが /history になるのを待つ
    await page.waitForURL('**/history');

    // 9. Verify Item in List
    // 最初のアイテムを確認
    const firstItem = page.locator('.grid > div').first();
    await expect(firstItem).toContainText(title);

    // 10. Edit Mode (Select/Delete)
    await page.getByRole('button', { name: /選択・削除/ }).click();

    // 11. Select First Item
    // ItemCard上の選択ボタンをクリック
    await firstItem.locator('button').first().click();

    // 12. Delete
    // "削除"ボタンをクリック（件数が含まれる場合があるので正規表現）
    await page.getByRole('button', { name: /削除/ }).click();

    // 13. Undo
    // トーストの "元に戻す" ボタンをクリック
    const undoButton = page.getByText('元に戻す');
    await undoButton.click();

    // 14. Verify Undo
    // アイテムがまだ存在することを確認
    await expect(firstItem).toBeVisible();

    // 15. Final Delete (Clean up)
    // もう一度選択して本当に削除する
    // 復活したアイテムを選択（選択状態が解除されているため）
    await firstItem.locator('button').first().click();
    await page.getByRole('button', { name: /削除/ }).click();

    // Undoせずに待つ
    // トーストが消えるのを待つか、アイテムがリストから消えるのを確認
    // 自分のアイテムが消えたことを確認したいが、他にあればfirstItemは別のものになる。
    // まだ1件しかないと仮定すると、empty stateになるはず。
    // あるいは、titleが含まれていないことを確認する。
    await expect(page.locator('body')).not.toContainText(title, { timeout: 10000 });
});
