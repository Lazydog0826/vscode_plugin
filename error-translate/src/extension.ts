import * as vscode from "vscode";
import axios from "axios";
import { md5 } from "js-md5";

let arr: Array<MessageModel> = [];
let code = "";

// 获取插件设置
const config = vscode.workspace.getConfiguration("ErrorTranslate");
const AppId = config.get<string>("AppId") ?? "";
const AppKey = config.get<string>("AppKey") ?? "";

interface MessageModel {
  src: string;
  dst: string;
  start: vscode.Position;
  end: vscode.Position;
  decorationType: vscode.TextEditorDecorationType | undefined;
  type: vscode.DiagnosticSeverity;
}

interface TranslationResult {
  from: string;
  to: string;
  trans_result: Array<{
    src: string;
    dst: string;
  }>;
}

export function activate(context: vscode.ExtensionContext) {
  console.log("插件启动");

  // 显示信息
  let show = vscode.commands.registerCommand("et.run", () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const document = editor.document;
      const temCode = Math.random().toString().replace(".", "");
      code = temCode;

      // 先清除旧的
      arr.forEach((e) => {
        e.decorationType?.dispose();
      });
      arr = [];
      const diagnostics = vscode.languages.getDiagnostics(document.uri);
      diagnostics
        .filter(
          (x) =>
            x.severity === vscode.DiagnosticSeverity.Error ||
            x.severity === vscode.DiagnosticSeverity.Warning
        )
        .forEach((x) => {
          let splitArr = x.message.split("\n").filter((x2) => x2.trim() !== "");
          splitArr = [...new Set(splitArr)];
          splitArr.forEach((x2) => {
            arr.push({
              src: x2,
              dst: "",
              start: x.range.start,
              end: x.range.end,
              decorationType: undefined,
              type: x.severity,
            });
          });
        });
      translate(arr.map((x) => x.src)).then((r) => {
        if (temCode === code) {
          r.data.trans_result.forEach((x) => {
            arr
              .filter((x2) => x2.src === x.src)
              .forEach((x2) => {
                x2.dst = x.dst;
                x2.decorationType =
                  vscode.window.createTextEditorDecorationType({
                    isWholeLine: true,
                    after: {
                      contentText: x2.dst,
                      color:
                        x2.type === vscode.DiagnosticSeverity.Error
                          ? "rgba(235,47,6,1)"
                          : "rgba(250,152,58,1)",
                      backgroundColor:
                        x2.type === vscode.DiagnosticSeverity.Error
                          ? "rgba(235,47,6,0.2)"
                          : "rgba(250,152,58,0.2)",
                      margin: "0 5px 0 5px",
                    },
                  });
              });
          });
          arr.forEach((x) => {
            const errors: vscode.DecorationOptions[] = [
              {
                range: new vscode.Range(x.start, x.end),
              },
            ];
            if (x.decorationType) {
              editor?.setDecorations(x.decorationType, errors);
            }
          });
        }
      });
    }
  });

  // 隐藏信息
  let clear = vscode.commands.registerCommand("et.clear", () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      arr.forEach((e) => {
        e.decorationType?.dispose();
      });
      arr = [];
    }
  });

  context.subscriptions.push(show);
  context.subscriptions.push(clear);
}

function translate(q: Array<string>) {
  const qs = q.join("\n");
  var randomNumber = Math.random().toString().replace(".", "");
  const hash = md5(AppId + qs + randomNumber + AppKey);
  return axios<TranslationResult>({
    url: "https://fanyi-api.baidu.com/api/trans/vip/translate",
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: {
      q: qs,
      from: "auto",
      to: "zh",
      appid: AppId,
      salt: randomNumber,
      sign: hash,
    },
  });
}

export function deactivate() {
  console.log("插件已停用");
}
