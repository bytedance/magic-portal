/**
 * Copyright (c) 2020 Bytedance Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
// 将post-html的对象格式化为magic对象
import posthtml from 'posthtml';
import { Matcher, StringMatcher, Node } from 'posthtml/types/posthtml';
import { HtmlTagObject } from '@magic-microservices/magic/dist/src/utils/htmlTag';

type Maybe<T> = void | T;
type MaybeArray<T> = T | T[];

function format2MagicTagObj(postHtmlTagObj: Node): HtmlTagObject {
  return {
    attributes: postHtmlTagObj.attrs as Record<string, string>,
    tagName: postHtmlTagObj.tag as string,
    innerHTML: postHtmlTagObj.content?.join(''),
  };
}

export interface ICustomDOMMatcher {
  outputJsonKey: 'styles' | 'scripts';
  matcher: MaybeArray<Matcher<StringMatcher, Maybe<Record<string, StringMatcher>>>>;
}

export type IPortalHtmlParserResult = Record<
  ICustomDOMMatcher['outputJsonKey'],
  HtmlTagObject[]
>;

// 解析 & 分类资源
function getAsserts(
  tree: Node,
  result: IPortalHtmlParserResult,
  matchers?: ICustomDOMMatcher[],
): void {
  const baseRules: ICustomDOMMatcher[] = [
    {
      outputJsonKey: 'scripts',
      matcher: { tag: 'script' },
    },
    {
      outputJsonKey: 'styles',
      matcher: { tag: 'link', attrs: { rel: 'stylesheet' } },
    },
    {
      outputJsonKey: 'styles',
      matcher: { tag: 'style' },
    },
  ];

  [...(matchers || []), ...baseRules].forEach(({ matcher, outputJsonKey }) => {
    tree.match(matcher, (node) => {
      const magicObj = format2MagicTagObj(node);
      if (!result[outputJsonKey]) {
        result[outputJsonKey] = [];
      }
      result[outputJsonKey].push(magicObj);
      return node;
    });
  });
}

export function portalHtmlParser(
  html: string,
  matchers?: ICustomDOMMatcher[],
): IPortalHtmlParserResult {
  const result = {
    styles: [],
    scripts: [],
  };

  // 解析html并分类
  posthtml()
    .use((tree) => getAsserts(tree, result, matchers))
    .process(html, { sync: true });

  return result;
}
