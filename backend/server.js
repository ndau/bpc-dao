
// import { Hello } from './go_modules/test';
// console.log('Hello:', Hello());

/************************** EXPERIMENT RUNNING WASM IN NODEJS */
// 'use strict';
// import { argv, env } from 'node:process';
// globalThis.require = require;
// globalThis.fs = require('fs');
// globalThis.TextEncoder = require('util').TextEncoder;
// globalThis.TextDecoder = require('util').TextDecoder;

// globalThis.performance = {
//   now() {
//     const [sec, nsec] = process.hrtime();
//     return sec * 1000 + nsec / 1000000;
//   },
// };

// const crypto = require('crypto');
// globalThis.crypto = {
//   getRandomValues(b) {
//     crypto.randomFillSync(b);
//   },
// };

// require('./go_modules/wasm_exec');
// console.log(process.argv.slice(2));
// const go = new Go();
// go.argv = process.argv.slice(2);
// go.env = Object.assign({ TMPDIR: require('os').tmpdir() }, process.env);
// go.exit = process.exit;

// // get method name
// let func = 'Hello';

// // get function arguments
// let funcArgs = process.argv.slice(4);

// WebAssembly.instantiate(fs.readFileSync('./go_modules/main.wasm'), go.importObject)
//   .then((result) => {
//     process.on('exit', (code) => {
//       // Node.js exits if no event handler is pending

//       // commend the block avoid deadlock
//       // if (code === 0 && !go.exited) {
//       //   // deadlock, make Go print error and stack traces
//       //   go._pendingEvent = { id: 0 };
//       //   go._resume();
//       // }

//       // below code is to avoid deadlock
//       const result = globalThis[func](...funcArgs);

//       // output as strout
//       console.log(result);
//       process.exit();
//     });
//     return go.run(result.instance);
//   })
//   .catch((err) => {
//     console.error(err);
//     process.exit(1);
//   });

/********************************* */
// import { WASI } from 'wasi';
// // "start": "node --experimental-wasi-unstable-preview1 index.js",

// const fs = require('fs');
// console.log(WebAssembly);
// const instantiate = async (scriptName = '') => {
//   try {
//     const wasmPath = './go_modules/main.wasm';
//     if (!fs.existsSync(wasmPath)) {
//       throw new Error(`There is no "main.wasm" file in ./go_modules directory`);
//     }
//     console.log('Loading wasm module...');

//     const wasi = new WASI();
//     const importObject = {
//       env: {
//         __memory_base: 0,
//         __table_base: 0,
//         memory: new WebAssembly.Memory({
//           initial: 256,
//         }),
//         table: new WebAssembly.Table({
//           initial: 0,
//           element: 'anyfunc',
//         }),
//       },
//       wasi_snapshot_preview1: wasi.wasiImport,
//     };

//     const lib = await WebAssembly.instantiate(new Uint8Array(fs.readFileSync(wasmPath)), importObject).then((res) => {
//       console.log('wasmModule:', res);
//       console.log('instance:', res.instance);
//       return res.instance.exports;
//     });

//     console.log('instance is instantiated');
//   } catch (err) {
//     console.log('Error instantiate: ', err.message, err);
//   }
// };

// async function letsgo() {
//   try {
//     const lib = await instantiate();
//     console.log('lib........',lib);
//   } catch (e) {
//     console.log(e);
//   }
// }
// letsgo();
//******************************/

const express = require('express');
const parser = require("body-parser");
const ndauConnect = require('./src/socket/ndauConnect');

const { createServer } = require('http');
require('dotenv').config();

const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);

app.use(cors());
require('dotenv').config();

let routes = {
  proposalRouter: require('./src/routes/proposals_route'),
  voteRouter: require('./src/routes/votes_route'),
  adminRouter: require('./src/routes/admins_route'),
  superAdminRouter: require('./src/routes/superadmins_route'),
};

app.use(parser.urlencoded({extended : true}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

app.use('/api', routes.proposalRouter);
app.use('/api', routes.voteRouter);
app.use('/api', routes.adminRouter);
app.use('/api', routes.superAdminRouter);

//Server Port
const port = process.env.PORT || 3001;
httpServer.listen(port, () => console.log(`listening on port ${port}`));

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    transports: ['websocket', 'polling'],
    credentials: true,
  },
  allowEIO3: true,
});

ndauConnect(io);

exports.httpServer = httpServer;
