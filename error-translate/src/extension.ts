import * as vscode from "vscode";
import axios from "axios";
import { md5 } from "js-md5";

let arr: Array<MessageModel> = [];

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

export function activate(context: vscode.ExtensionContext) {
  console.log("插件启动");
  let command = vscode.commands.registerCommand("et.run", () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const document = editor.document;
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
          x.message
            .split("\n")
            .filter((x2) => x2.trim() !== "")
            .forEach((x2) => {
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
        r.data.trans_result.forEach((x: { src: string; dst: string }) => {
          arr
            .filter((x2) => x2.src === x.src)
            .forEach((x2) => {
              x2.dst = x.dst;
              x2.decorationType = vscode.window.createTextEditorDecorationType({
                after: {
                  contentText: x2.dst,
                  color:
                    x2.type === vscode.DiagnosticSeverity.Error
                      ? "red"
                      : "yellow",
                  margin: "0 0 0 20px",
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
      });
    }
  });
  context.subscriptions.push(command);
}

function translate(q: Array<string>) {
  const qs = q.join("\n");
  var randomNumber = Math.random().toString().replace(".", "");
  const hash = md5(AppId + qs + randomNumber + AppKey);
  return axios({
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
