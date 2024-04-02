import svelte from "rollup-plugin-svelte";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import { terser } from "rollup-plugin-terser";
import sveltePreprocess from "svelte-preprocess";
import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";
import { svelteSVG } from 'rollup-plugin-svelte-svg';
import builtins from 'rollup-plugin-node-builtins';
import path from 'path';
import fs from 'fs';
import css from 'rollup-plugin-css-only';

const production = !process.env.ROLLUP_WATCH;

export default fs
    .readdirSync(path.join(__dirname, "webviews", "pages"))
    .map((input) => {
        const name = input.split(".")[0];
        return {
            input: "webviews/pages/" + input,
            output: {
                sourcemap: !production,
                format: "iife",
                name: "app",
                file: "out/compiled/" + name + ".js",
                assetFileNames: name + '.css',
            },
            onwarn: function (message) {
                if (message.code !== 'EVAL'){
                    console.log(JSON.stringify(message));
                    throw new Error(message);
                } 
            },
            plugins: [
                svelte({
                    compilerOptions: {
                        // enable run-time checks when not in production
                        dev: !production,
                      },
                    preprocess: sveltePreprocess({ 
                        sourceMap: !production,
                        postcss: {
                            plugins: [require('tailwindcss'), require('autoprefixer')],
                          },
                    }),
                    emitCss: production,
                }),
                css(),
                json(),
                resolve({
                    browser: true,
                    dedupe: ["svelte"],
                    preferBuiltins: false
                }),
                commonjs(),
                builtins(),
                typescript({
                    tsconfig: "webviews/tsconfig.json",
                    sourceMap: !production,
                    inlineSources: !production,
                }),
                svelteSVG({
                    // optional SVGO options
                    // pass empty object to enable defaults
                    svgo: {},
                  }),
                production && terser(),
            ],
            watch: {
                clearScreen: false,
            },
        };
    });
