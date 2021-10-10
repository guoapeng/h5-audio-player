module.exports = {
    presets: [
        [
            '@babel/preset-env',
            {
                //false: 不对当前的js 进行polyfill 填充
                //usage: 依据源代码当中使用到的新语法进行填充
                useBuiltIns: false,
                corejs: 3
            }
        ]
    ]
}