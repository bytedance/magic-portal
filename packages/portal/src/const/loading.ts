/**
 * Copyright (c) 2020 Bytedance Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
export const LOADING_CONTAINER_ID = 'magic-portal-loading';

export const loadingDom = `
<div id="magic-portal-default-loading-container">
    <svg width="28" height="28" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" class="">
    <g stroke="none" stroke-width="4" fill="none" fill-rule="evenodd">
        <g>
        <path
            class="svg-loading-outer"
            d="M4,24 C4,35.045695 12.954305,44 24,44 L24,44 C35.045695,44 44,35.045695 44,24 C44,12.954305 35.045695,4 24,4"
            stroke="#57A5FF"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
        ></path>
        <path
            class="svg-loading-inner"
            d="M36,24 C36,17.372583 30.627417,12 24,12 C17.372583,12 12,17.372583 12,24 C12,30.627417 17.372583,36 24,36 L24,36"
            stroke="#57A5FF"
            stroke-width="4"
            stroke-linecap="round"
            stroke-linejoin="round"
        ></path>
        </g>
    </g>
    </svg>
</div>
`;

export const loadingStyleCss = `
@-webkit-keyframes svg-loading-outer {
0% {
    transform: rotate(0deg);
    /* Firefox 16+, IE 10+, Opera */
}
100% {
    transform: rotate(360deg);
    /* Firefox 16+, IE 10+, Opera */
}
}
@-moz-keyframes svg-loading-outer {
0% {
    -moz-transform: rotate(0deg);
    /* Firefox 16+*/
}
100% {
    -moz-transform: rotate(360deg);
    /* Firefox 16+*/
}
}
@keyframes svg-loading-outer {
0% {
    transform: rotate(0deg);
    /* Firefox 16+, IE 10+, Opera */
}
100% {
    transform: rotate(360deg);
    /* Firefox 16+, IE 10+, Opera */
}
}

@-webkit-keyframes svg-loading-inner {
0% {
    transform: rotate(360deg);
    /* Firefox 16+*/
}
100% {
    /* Firefox 16+*/
    transform: rotate(0deg);
}
}
@-moz-keyframes svg-loading-inner {
0% {
    -moz-transform: rotate(360deg);
    /* Firefox 16+*/
}
100% {
    /* Firefox 16+*/
    -moz-transform: rotate(0deg);
}
}
@keyframes svg-loading-inner {
0% {
    transform: rotate(360deg);
    /* Firefox 16+*/
}
100% {
    /* Firefox 16+*/
    transform: rotate(0deg);
}
}

#magic-portal-default-loading-container {
    display: flex;
    justify-content: center;
    align-items: center;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1000;
    background: #fff;
    backface-visibility: hidden;
}

#magic-portal-default-loading-container .svg-loading-outer {
    animation: svg-loading-outer 2s linear infinite;
    transform-origin: 50%;
}

#magic-portal-default-loading-container .svg-loading-inner {
    animation: svg-loading-inner 2s linear infinite;
    transform-origin: 50%;
}
`;
