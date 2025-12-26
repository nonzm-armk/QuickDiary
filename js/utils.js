/**
 * ユーティリティ関数: 画像リサイズ、日付フォーマット変換など
 */
const Utils = {
    /**
     * 画像ファイルをリサイズ
     * @param {File} file - 画像ファイル
     * @param {number} maxWidth - 最大幅（デフォルト: 1024px）
     * @returns {Promise<Blob>} - リサイズされた画像のBlob
     */
    async resizeImage(file, maxWidth = 1024) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const img = new Image();
                
                img.onload = () => {
                    // 元の画像のサイズ
                    const originalWidth = img.width;
                    const originalHeight = img.height;
                    
                    // リサイズが必要かチェック
                    if (originalWidth <= maxWidth) {
                        // リサイズ不要の場合はそのまま返す
                        resolve(file);
                        return;
                    }
                    
                    // アスペクト比を維持してリサイズ
                    const ratio = maxWidth / originalWidth;
                    const newWidth = maxWidth;
                    const newHeight = originalHeight * ratio;
                    
                    // Canvasを作成
                    const canvas = document.createElement('canvas');
                    canvas.width = newWidth;
                    canvas.height = newHeight;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, newWidth, newHeight);
                    
                    // Blobとしてエクスポート
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                resolve(blob);
                            } else {
                                reject(new Error('画像の圧縮に失敗しました'));
                            }
                        },
                        'image/jpeg',
                        0.9 // 品質: 90%
                    );
                };
                
                img.onerror = () => {
                    reject(new Error('画像の読み込みに失敗しました'));
                };
                
                img.src = e.target.result;
            };
            
            reader.onerror = () => {
                reject(new Error('ファイルの読み込みに失敗しました'));
            };
            
            reader.readAsDataURL(file);
        });
    },

    /**
     * ファイルサイズを人間が読みやすい形式に変換
     * @param {number} bytes - バイト数
     * @returns {string} - フォーマットされた文字列
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    },

    /**
     * 一意なファイル名を生成
     * @param {string} userId - ユーザーID
     * @param {string} date - 日付 (YYYY-MM-DD)
     * @param {number} index - 画像のインデックス
     * @param {string} extension - 拡張子
     * @returns {string} - ファイルパス
     */
    generateImagePath(userId, date, index, extension = 'jpg') {
        return `users/${userId}/images/${date}_${index}.${extension}`;
    },

    /**
     * URLから画像パスを抽出
     * @param {string} url - ダウンロードURL
     * @returns {string} - パス部分
     */
    extractPathFromUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathMatch = urlObj.pathname.match(/\/o\/(.+?)\?/);
            if (pathMatch && pathMatch[1]) {
                return decodeURIComponent(pathMatch[1]);
            }
            return '';
        } catch (error) {
            console.error('URLの解析エラー:', error);
            return '';
        }
    }
};

// グローバルに公開
window.Utils = Utils;
