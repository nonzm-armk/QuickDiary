/**
 * Auth層: ログイン認証管理、設定情報の管理
 */
const Auth = {
    /**
     * Firebase設定を保存
     * @param {Object} config - Firebase設定オブジェクト
     */
    saveConfig(config) {
        try {
            localStorage.setItem('firebaseConfig', JSON.stringify(config));
            return true;
        } catch (error) {
            console.error('設定の保存に失敗しました:', error);
            return false;
        }
    },

    /**
     * Firebase設定を読み込み
     * @returns {Object|null} - Firebase設定オブジェクトまたはnull
     */
    loadConfig() {
        try {
            const config = localStorage.getItem('firebaseConfig');
            return config ? JSON.parse(config) : null;
        } catch (error) {
            console.error('設定の読み込みに失敗しました:', error);
            return null;
        }
    },

    /**
     * ログイン情報を保存
     * @param {string} email - メールアドレス
     * @param {string} uid - ユーザーID
     */
    saveLoginInfo(email, uid) {
        try {
            const loginInfo = { email, uid };
            localStorage.setItem('loginInfo', JSON.stringify(loginInfo));
            return true;
        } catch (error) {
            console.error('ログイン情報の保存に失敗しました:', error);
            return false;
        }
    },

    /**
     * ログイン情報を読み込み
     * @returns {Object|null} - ログイン情報またはnull
     */
    loadLoginInfo() {
        try {
            const loginInfo = localStorage.getItem('loginInfo');
            return loginInfo ? JSON.parse(loginInfo) : null;
        } catch (error) {
            console.error('ログイン情報の読み込みに失敗しました:', error);
            return null;
        }
    },

    /**
     * ログイン情報をクリア
     */
    clearLoginInfo() {
        try {
            localStorage.removeItem('loginInfo');
            return true;
        } catch (error) {
            console.error('ログイン情報のクリアに失敗しました:', error);
            return false;
        }
    },

    /**
     * ログイン済みかチェック
     * @returns {boolean}
     */
    isLoggedIn() {
        const loginInfo = this.loadLoginInfo();
        return loginInfo !== null && loginInfo.uid !== undefined;
    },

    /**
     * Firebase Authenticationでログイン
     * @param {string} email - メールアドレス
     * @param {string} password - パスワード
     * @returns {Promise<Object>} - ユーザー情報
     */
    async login(email, password) {
        if (!window.Store || !window.Store.auth) {
            throw new Error('Firebase Authenticationが初期化されていません');
        }

        try {
            const { signInWithEmailAndPassword } = window.firebaseAuth;
            const userCredential = await signInWithEmailAndPassword(
                window.Store.auth,
                email,
                password
            );
            
            // ログイン情報を保存
            this.saveLoginInfo(email, userCredential.user.uid);
            
            return {
                uid: userCredential.user.uid,
                email: userCredential.user.email
            };
        } catch (error) {
            console.error('ログインエラー:', error);
            throw error;
        }
    },

    /**
     * ログアウト
     * @returns {Promise<boolean>}
     */
    async logout() {
        if (!window.Store || !window.Store.auth) {
            throw new Error('Firebase Authenticationが初期化されていません');
        }

        try {
            const { signOut } = window.firebaseAuth;
            await signOut(window.Store.auth);
            this.clearLoginInfo();
            return true;
        } catch (error) {
            console.error('ログアウトエラー:', error);
            throw error;
        }
    },

    /**
     * 設定画面のフォームから値を取得
     * @returns {Object} - 設定情報
     */
    getConfigFromForm() {
        return {
            apiKey: document.getElementById('apiKey')?.value || '',
            authDomain: document.getElementById('authDomain')?.value || '',
            projectId: document.getElementById('projectId')?.value || '',
            storageBucket: document.getElementById('storageBucket')?.value || '',
            messagingSenderId: document.getElementById('messagingSenderId')?.value || '',
            appId: document.getElementById('appId')?.value || ''
        };
    },

    /**
     * 設定画面のフォームに値をセット
     * @param {Object} config - 設定情報
     */
    setConfigToForm(config) {
        if (config.apiKey) document.getElementById('apiKey').value = config.apiKey;
        if (config.authDomain) document.getElementById('authDomain').value = config.authDomain;
        if (config.projectId) document.getElementById('projectId').value = config.projectId;
        if (config.storageBucket) document.getElementById('storageBucket').value = config.storageBucket;
        if (config.messagingSenderId) document.getElementById('messagingSenderId').value = config.messagingSenderId;
        if (config.appId) document.getElementById('appId').value = config.appId;
    },

    /**
     * ログイン情報のフォームから値を取得
     * @returns {Object} - メールアドレスとパスワード
     */
    getLoginFromForm() {
        return {
            email: document.getElementById('email')?.value || '',
            password: document.getElementById('password')?.value || ''
        };
    }
};
