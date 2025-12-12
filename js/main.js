/**
 * App層: 全体のステート管理とイベントハンドラ
 */
const App = {
    state: {
        currentDate: new Date(),
        currentYear: new Date().getFullYear(),
        currentMonth: new Date().getMonth(),
        user: null
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
        
        // 既存の記事を読み込み
        try {
            const entry = await Store.loadEntry(dateString);
            if (entry) {
                View.setEditorData(entry);
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
        
        // その日の記事を読み込み
        try {
            const entry = await Store.loadEntry(dateString);
            if (entry) {
                View.setEditorData(entry);
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

        try {
            await Store.saveEntry(dateString, data);
            alert('保存しました！');
            
            // カレンダー画面へ戻る
            await this.showCalendar();
        } catch (error) {
            console.error('保存エラー:', error);
            alert('保存に失敗しました: ' + error.message);
        }
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
