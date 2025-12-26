/**
 * App層: 全体のステート管理とイベントハンドラ
 */
const App = {
    state: {
        currentDate: new Date(),
        currentYear: new Date().getFullYear(),
        currentMonth: new Date().getMonth(),
        user: null,
        selectedImages: [], // 新規選択された画像ファイル
        currentImageUrls: [] // 既存の画像URL（編集時）
    },

    /**
     * アプリケーション初期化
     */
    async init() {
        console.log('アプリケーション初期化開始');

        // 設定の読み込み
        const config = Auth.loadConfig();
        
        if (!config) {
            // 設定がない場合は設定画面へ
            console.log('設定が見つかりません。設定画面を表示します。');
            View.showScreen('settings');
            this.setupSettingsForm();
            return;
        }

        // Firebaseを初期化
        const initialized = Store.initialize(config);
        if (!initialized) {
            alert('Firebase設定が正しくありません。設定を確認してください。');
            View.showScreen('settings');
            this.setupSettingsForm();
            return;
        }

        // ログイン状態チェック
        if (!Auth.isLoggedIn()) {
            console.log('ログインしていません。設定画面を表示します。');
            View.showScreen('settings');
            this.setupSettingsForm();
            // 既存の設定をフォームにセット
            Auth.setConfigToForm(config);
            return;
        }

        // ログイン済みの場合、今日の日記画面へ
        console.log('ログイン済み。今日の日記画面を表示します。');
        this.state.user = Auth.loadLoginInfo();
        await this.showTodayEditor();
        
        // イベントリスナーをセットアップ
        this.setupEventListeners();
    },

    /**
     * 設定画面のフォームをセットアップ
     */
    setupSettingsForm() {
        const saveButton = document.getElementById('save-config-btn');
        if (saveButton) {
            saveButton.addEventListener('click', async () => {
                await this.handleSaveConfig();
            });
        }
    },

    /**
     * イベントリスナーをセットアップ
     */
    setupEventListeners() {
        // メニューボタン
        const menuBtn = document.getElementById('menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                View.openMenu();
            });
        }

        // メニューオーバーレイ（背景クリックで閉じる）
        const menuOverlay = document.getElementById('menu-overlay');
        if (menuOverlay) {
            menuOverlay.addEventListener('click', (e) => {
                if (e.target === menuOverlay) {
                    View.closeMenu();
                }
            });
        }

        // メニュー項目
        const todayMenuItem = document.getElementById('menu-today');
        if (todayMenuItem) {
            todayMenuItem.addEventListener('click', async () => {
                await this.showTodayEditor();
            });
        }

        const calendarMenuItem = document.getElementById('menu-calendar');
        if (calendarMenuItem) {
            calendarMenuItem.addEventListener('click', async () => {
                await this.showCalendar();
            });
        }

        // OKボタン（保存）
        const okBtn = document.getElementById('ok-btn');
        if (okBtn) {
            okBtn.addEventListener('click', async () => {
                await this.handleSave();
            });
        }

        // 削除ボタン
        const deleteBtn = document.getElementById('delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                await this.handleDelete();
            });
        }

        // 気分ボタン
        const moodButtons = document.querySelectorAll('.mood-btn');
        moodButtons.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                this.handleMoodSelect(index);
            });
        });

        // カラーボタン
        const colorButtons = document.querySelectorAll('.color-btn');
        colorButtons.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                this.handleColorSelect(index);
            });
        });

        // カレンダーナビゲーション
        const prevMonthBtn = document.getElementById('prev-month');
        if (prevMonthBtn) {
            prevMonthBtn.addEventListener('click', async () => {
                await this.navigateMonth(-1);
            });
        }

        const nextMonthBtn = document.getElementById('next-month');
        if (nextMonthBtn) {
            nextMonthBtn.addEventListener('click', async () => {
                await this.navigateMonth(1);
            });
        }

        const todayBtn = document.getElementById('today-btn');
        if (todayBtn) {
            todayBtn.addEventListener('click', async () => {
                this.state.currentYear = new Date().getFullYear();
                this.state.currentMonth = new Date().getMonth();
                await this.showCalendar();
            });
        }

        // カメラボタン（画像選択）
        const cameraBtn = document.querySelector('.camera-btn');
        const imageInput = document.getElementById('image-input');
        if (cameraBtn && imageInput) {
            cameraBtn.addEventListener('click', () => {
                imageInput.click();
            });

            imageInput.addEventListener('change', (e) => {
                this.handleImageSelect(e.target.files);
            });
        }
    },

    /**
     * 設定を保存してログイン
     */
    async handleSaveConfig() {
        const config = Auth.getConfigFromForm();
        const loginData = Auth.getLoginFromForm();

        // バリデーション
        if (!config.apiKey || !config.projectId) {
            alert('Firebase設定が不完全です。');
            return;
        }

        if (!loginData.email || !loginData.password) {
            alert('メールアドレスとパスワードを入力してください。');
            return;
        }

        // 設定を保存
        Auth.saveConfig(config);

        // Firebaseを初期化
        const initialized = Store.initialize(config);
        if (!initialized) {
            alert('Firebase初期化に失敗しました。設定を確認してください。');
            return;
        }

        // ログイン
        try {
            const user = await Auth.login(loginData.email, loginData.password);
            this.state.user = user;
            alert('ログインに成功しました！');
            
            // イベントリスナーをセットアップ
            this.setupEventListeners();
            
            // 今日の日記画面へ
            await this.showTodayEditor();
        } catch (error) {
            alert('ログインに失敗しました: ' + error.message);
        }
    },

    /**
     * 今日の日記画面を表示
     */
    async showTodayEditor() {
        const today = new Date();
        this.state.currentDate = today;
        
        const dateString = this.formatDate(today);
        
        // 日付表示を更新
        View.updateDateDisplay(today);
        
        // 画像状態をリセット
        this.state.selectedImages = [];
        this.state.currentImageUrls = [];
        
        // 既存の記事を読み込み
        try {
            const entry = await Store.loadEntry(dateString);
            if (entry) {
                View.setEditorData(entry);
                this.state.currentImageUrls = entry.images || [];
            } else {
                View.clearEditor();
            }
        } catch (error) {
            console.error('記事の読み込みエラー:', error);
            View.clearEditor();
        }
        
        View.showScreen('editor');
    },

    /**
     * カレンダー画面を表示
     */
    async showCalendar() {
        try {
            // その月の記事を取得
            const entries = await Store.getEntriesForMonth(
                this.state.currentYear,
                this.state.currentMonth + 1
            );
            
            // カレンダーを描画
            View.renderCalendar(this.state.currentYear, this.state.currentMonth, entries);
            View.showScreen('calendar');
        } catch (error) {
            console.error('カレンダー表示エラー:', error);
            alert('カレンダーの読み込みに失敗しました。');
        }
    },

    /**
     * 日付が選択された時の処理
     * @param {number} year - 年
     * @param {number} month - 月 (0-11)
     * @param {number} day - 日
     */
    async handleDateSelect(year, month, day) {
        const selectedDate = new Date(year, month, day);
        this.state.currentDate = selectedDate;
        
        const dateString = this.formatDate(selectedDate);
        
        // 日付表示を更新
        View.updateDateDisplay(selectedDate);
        
        // 画像状態をリセット
        this.state.selectedImages = [];
        this.state.currentImageUrls = [];
        
        // その日の記事を読み込み
        try {
            const entry = await Store.loadEntry(dateString);
            if (entry) {
                View.setEditorData(entry);
                this.state.currentImageUrls = entry.images || [];
            } else {
                View.clearEditor();
            }
        } catch (error) {
            console.error('記事の読み込みエラー:', error);
            View.clearEditor();
        }
        
        View.showScreen('editor');
    },

    /**
     * 保存処理
     */
    async handleSave() {
        const dateString = this.formatDate(this.state.currentDate);
        const data = View.getEditorData();

        // バリデーション: 入力内容のチェック
        if (!data.text && this.state.selectedImages.length === 0 && this.state.currentImageUrls.length === 0 && data.mood === null) {
            alert('テキスト、画像、または気分のいずれかを入力してください。');
            return;
        }

        // ローディング表示
        View.showLoading('保存中...');

        try {
            // 画像の処理
            const imageUrls = [];
            
            // 新規画像のアップロード
            if (this.state.selectedImages.length > 0) {
                const loginInfo = Auth.loadLoginInfo();
                if (!loginInfo) {
                    throw new Error('ログインしていません');
                }

                for (let i = 0; i < this.state.selectedImages.length; i++) {
                    const file = this.state.selectedImages[i];
                    
                    try {
                        // 画像をリサイズ
                        const resizedBlob = await Utils.resizeImage(file, 1024);
                        
                        // Storageにアップロード
                        const imagePath = Utils.generateImagePath(
                            loginInfo.uid,
                            dateString,
                            this.state.currentImageUrls.length + i
                        );
                        
                        const url = await Store.uploadImage(resizedBlob, imagePath);
                        imageUrls.push(url);
                    } catch (imageError) {
                        console.error('画像アップロードエラー:', imageError);
                        View.hideLoading();
                        alert(`画像のアップロードに失敗しました（${i + 1}枚目）\n${imageError.message}`);
                        return;
                    }
                }
            }
            
            // 既存の画像URLを保持
            const allImageUrls = [...this.state.currentImageUrls, ...imageUrls];
            
            // データに画像URLを追加
            data.images = allImageUrls;
            
            await Store.saveEntry(dateString, data);
            
            View.hideLoading();
            alert('保存しました！');
            
            // 状態をリセット
            this.state.selectedImages = [];
            this.state.currentImageUrls = [];
            
            // カレンダー画面へ戻る
            await this.showCalendar();
        } catch (error) {
            View.hideLoading();
            console.error('保存エラー:', error);
            
            // エラーメッセージを分かりやすく
            let errorMessage = '保存に失敗しました。';
            if (error.code === 'permission-denied') {
                errorMessage = '保存の権限がありません。ログイン状態を確認してください。';
            } else if (error.code === 'unavailable') {
                errorMessage = 'ネットワークエラーが発生しました。接続を確認してください。';
            } else if (error.message) {
                errorMessage = `保存に失敗しました: ${error.message}`;
            }
            
            alert(errorMessage);
        }
    },

    /**
     * 画像選択時の処理
     * @param {FileList} files - 選択されたファイル
     */
    handleImageSelect(files) {
        const filesArray = Array.from(files);
        
        // 画像ファイルのみフィルタ
        const imageFiles = filesArray.filter(file => file.type.startsWith('image/'));
        
        // 最大5枚まで
        const totalImages = this.state.selectedImages.length + this.state.currentImageUrls.length;
        const availableSlots = 5 - totalImages;
        
        if (availableSlots <= 0) {
            alert('画像は最大5枚までです。');
            return;
        }
        
        const filesToAdd = imageFiles.slice(0, availableSlots);
        this.state.selectedImages.push(...filesToAdd);
        
        // プレビュー表示を更新
        this.updateImagePreviews();
        
        if (imageFiles.length > availableSlots) {
            alert(`画像は最大5枚までです。${availableSlots}枚のみ追加されました。`);
        }
    },

    /**
     * 画像プレビューを更新
     */
    updateImagePreviews() {
        const allImages = [
            ...this.state.currentImageUrls,
            ...this.state.selectedImages
        ];
        
        if (allImages.length === 0) {
            View.clearImages();
            return;
        }
        
        // URLと File が混在する場合の処理
        const previewContainer = document.getElementById('image-preview');
        if (!previewContainer) return;
        
        previewContainer.innerHTML = '';
        
        allImages.forEach((item, index) => {
            if (typeof item === 'string') {
                // URL（既存画像）
                this.addImagePreview(item, index, previewContainer);
            } else {
                // File（新規画像）
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.addImagePreview(e.target.result, index, previewContainer);
                };
                reader.readAsDataURL(item);
            }
        });
    },

    /**
     * 画像プレビューを追加
     * @param {string} src - 画像のソース
     * @param {number} index - インデックス
     * @param {HTMLElement} container - コンテナ要素
     */
    addImagePreview(src, index, container) {
        const imgWrapper = document.createElement('div');
        imgWrapper.className = 'image-preview-item';
        
        const img = document.createElement('img');
        img.src = src;
        img.alt = `画像 ${index + 1}`;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'image-remove-btn';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = () => {
            this.removeImage(index);
        };
        
        imgWrapper.appendChild(img);
        imgWrapper.appendChild(removeBtn);
        container.appendChild(imgWrapper);
    },

    /**
     * 画像を削除
     * @param {number} index - 削除する画像のインデックス
     */
    removeImage(index) {
        const currentUrlsCount = this.state.currentImageUrls.length;
        
        if (index < currentUrlsCount) {
            // 既存画像の削除
            this.state.currentImageUrls.splice(index, 1);
        } else {
            // 新規画像の削除
            const newImageIndex = index - currentUrlsCount;
            this.state.selectedImages.splice(newImageIndex, 1);
        }
        
        this.updateImagePreviews();
    },

    /**
     * 気分選択処理
     * @param {number} index - 選択された気分のインデックス
     */
    handleMoodSelect(index) {
        const moodButtons = document.querySelectorAll('.mood-btn');
        moodButtons.forEach((btn, i) => {
            if (i === index) {
                btn.classList.toggle('active');
            } else {
                btn.classList.remove('active');
            }
        });
    },

    /**
     * カラー選択処理
     * @param {number} index - 選択されたカラーのインデックス
     */
    handleColorSelect(index) {
        const colorButtons = document.querySelectorAll('.color-btn');
        colorButtons.forEach((btn, i) => {
            if (i === index) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    },

    /**
     * 削除処理
     */
    async handleDelete() {
        // 削除確認
        const confirmed = confirm('この記事を削除しますか？\nこの操作は取り消せません。');
        if (!confirmed) {
            return;
        }

        const dateString = this.formatDate(this.state.currentDate);

        // ローディング表示
        View.showLoading('削除中...');

        try {
            // 画像の削除
            if (this.state.currentImageUrls && this.state.currentImageUrls.length > 0) {
                const loginInfo = Auth.loadLoginInfo();
                if (loginInfo) {
                    for (const url of this.state.currentImageUrls) {
                        try {
                            const imagePath = Utils.extractPathFromUrl(url);
                            if (imagePath) {
                                await Store.deleteImage(imagePath);
                            }
                        } catch (error) {
                            console.error('画像の削除エラー:', error);
                            // 画像削除エラーは無視して続行
                        }
                    }
                }
            }

            // Firestoreから記事を削除
            await Store.deleteEntry(dateString);
            
            View.hideLoading();
            alert('削除しました！');
            
            // 状態をリセット
            this.state.selectedImages = [];
            this.state.currentImageUrls = [];
            
            // カレンダー画面へ戻る
            await this.showCalendar();
        } catch (error) {
            View.hideLoading();
            console.error('削除エラー:', error);
            
            // エラーメッセージを分かりやすく
            let errorMessage = '削除に失敗しました。';
            if (error.code === 'permission-denied') {
                errorMessage = '削除の権限がありません。ログイン状態を確認してください。';
            } else if (error.code === 'unavailable') {
                errorMessage = 'ネットワークエラーが発生しました。接続を確認してください。';
            } else if (error.message) {
                errorMessage = `削除に失敗しました: ${error.message}`;
            }
            
            alert(errorMessage);
        }
    },

    /**
     * 月の移動
     * @param {number} direction - 移動方向 (-1: 前月, 1: 次月)
     */
    async navigateMonth(direction) {
        this.state.currentMonth += direction;
        
        if (this.state.currentMonth < 0) {
            this.state.currentMonth = 11;
            this.state.currentYear--;
        } else if (this.state.currentMonth > 11) {
            this.state.currentMonth = 0;
            this.state.currentYear++;
        }
        
        await this.showCalendar();
    },

    /**
     * 日付をYYYY-MM-DD形式にフォーマット
     * @param {Date} date - 日付オブジェクト
     * @returns {string}
     */
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
};

// グローバルに公開（他のモジュールから参照できるように）
window.App = App;
window.View = View;
window.Auth = Auth;
window.Store = Store;

// DOMの読み込み完了後にアプリを初期化
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
