
const PROJECT = "render";
module.exports = [
	{
		target: 'web',
		mode: 'development',
		entry: __dirname + '/src/main.js',
		output: {
			path: __dirname + '/dist',
			filename: PROJECT + '.js',
			libraryTarget: 'umd'
		},
		module: {
			rules: [
				{
					test: /\.glsl$/i,
					use: [
						{
							loader: 'raw-loader',
							options: {
								esModule: false,
							},
						},
					],
				},
			],
		},
	}, {
		target: 'web',
		mode: 'production',
		entry: __dirname + '/src/main.js',
		output: {
			path: __dirname + '/dist',
			filename: PROJECT + '-min.js',
			libraryTarget: 'umd'
		},
		module: {
			rules: [
				{
					test: /\.glsl$/i,
					use: [
						{
							loader: 'raw-loader',
							options: {
								esModule: false,
							},
						},
					],
				},
			],
		},
	}
];