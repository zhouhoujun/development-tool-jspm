import {Tools} from './src/tools';

Tools.create(__dirname, {
    dist: 'lib',
    src: 'src',
    app: '',
    developmentFolder: '',
    production: {
        folder: ''
    }
    // tsConfigFile: Tools.join(__dirname, 'tsconfig.json')
});
