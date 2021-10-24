module.exports = {
    env: {
        browser: true, //指定项目运行的环境，如果不写那么所有浏览器的api都会报红，表示非法
        es2020: true, //支持es2020的语法
        node: true, //支持node.js的api，如果不写，所有common.js的规范，比如module.exports语法不支持了
    },
    parserOptions: { //指定要支持的语言选项
        ecmaVersion: 11, //支持目标es版本，这里设置es11
        sourceType: 'module',
        ecmaFeatures: { //设置其他选项
            jsx: true, //支持jsx语法
        },
    },
    plugins: ['html', "react", 'react-hooks'], //添加第三方插件
    extends: ['eslint:recommended', 'plugin:react-hooks/recommended'], //扩展规则集
    rules: {
        "react/jsx-uses-react": 1 //使用规则
    }
}