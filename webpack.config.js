const {resolve} = require('path');

module.exports= {
   //webpack的js入口, 里面定义打包资源
    entry: './src/index.js',
    output: {
       //audioplayer为输出文件的文件名前缀
        filename: 'audioplayer.bundle.js',
        path: resolve(__dirname, 'dest'),
    },
    module: {
        rules: [
            //javascript处理规则配置
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: ['babel-loader']
            }
        ]
    },
    devtool: "cheap-module-source-map",
    mode: 'development'
}