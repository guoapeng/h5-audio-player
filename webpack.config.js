const {resolve} = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports= {
   //webpack的js入口, 里面定义打包资源
    entry: './src/index.js',
    output: {
       //webpack3 为项目名, 可替换成你自己的项目名
        filename: 'js/audioplayer.bundle.js',
        path: resolve(__dirname, 'build'),
    },
    module: {
        rules: [
            //loader的配置
            {
                test: /\.css$/,
                use: [
                    //创建style标签, 将js中的中的样式资源插入进去, 添加到head中生效, 本项目未用到, 本项目采用的是MiniCssExtractPlugin, 将css输出到独立的文件
                    //'style-loader',
                    //将经过css-loader处理后的文件输出到独立的css文件, 该独立css在新建MiniCssExtractPlugin的时候已经指定, 请参考plugin区域
                    MiniCssExtractPlugin.loader,
                    //将css文件变成commonjs模块加载js中, 里面内容是样式字符串
                    'css-loader'
                ]
            }
            
        ]
    },
    plugins: [
        new MiniCssExtractPlugin({
           //webpack3  为项目名
            filename: 'css/webpack3.css'
        })
    ],
    //开发服务器配置, 用来实现开发过程自动(自动编译, 自动打开浏览器, 自动更新浏览器)
    //特点,只会在内存中编译打包, 不会有任何输出.
    devServer: {
        static: {
          directory: resolve(__dirname, 'build'),
        },
        compress: true,
        port: 3000,
        //自动打开浏览器
        open: true
    },

    mode: 'development'
}