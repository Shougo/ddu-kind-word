import {
  ActionFlags,
  type Actions,
  type BaseParams,
  type Context,
  type DduItem,
  type PreviewContext,
  type Previewer,
} from "@shougo/ddu-vim/types";
import { BaseKind } from "@shougo/ddu-vim/kind";
import type { DdcItem } from "@shougo/ddc-vim/types";

import type { Denops } from "@denops/std";
import * as fn from "@denops/std/function";
import * as vars from "@denops/std/variable";
import * as op from "@denops/std/option";

/**
 * Action data for word kind items.
 */
export type ActionData = {
  /** Text to paste/feedkeys. */
  text: string;
  /** Register type used by paste/insert. */
  regType?: string;
  /** Completed item for |CompleteDone| autocmd. */
  item?: DdcItem;
  /** Preview content. If omitted, text is used. */
  info?: string;
};

export const WordActions: Actions<Params> = {
  append: {
    description: "Paste the words like |p|.",
    callback: async (
      args: { denops: Denops; context: Context; items: DduItem[] },
    ) => {
      for (const item of args.items) {
        await paste(args.denops, args.context.mode, item, "p");
      }
      return ActionFlags.None;
    },
  },
  complete: {
    description: "It is same with |ddu-kind-word-action-feedkeys| " +
      "but it fires |CompleteDone| autocmd and changes |v:completed_item|.",
    callback: async (args: { denops: Denops; items: DduItem[] }) => {
      for (const item of args.items) {
        await feedWord(args.denops, item);

        const completedItem = (item?.action as ActionData)?.item;
        if (!completedItem) {
          continue;
        }

        try {
          await vars.g.set(args.denops, "completed_item", completedItem);
        } catch (_: unknown) {
          // Ignore
        }

        await args.denops.cmd("silent! doautocmd <nomodeline> CompleteDone");
      }
      return ActionFlags.None;
    },
  },
  feedkeys: {
    description: "Use |feedkeys()| to insert the words.",
    callback: async (args: { denops: Denops; items: DduItem[] }) => {
      for (const item of args.items) {
        await feedWord(args.denops, item);
      }
      return ActionFlags.None;
    },
  },
  insert: {
    description: "Paste the words like |P|.",
    callback: async (
      args: { denops: Denops; context: Context; items: DduItem[] },
    ) => {
      for (const item of args.items) {
        await paste(args.denops, args.context.mode, item, "P");
      }
      return ActionFlags.None;
    },
  },
  yank: {
    description: "Yank the words.",
    callback: async (args: { denops: Denops; items: DduItem[] }) => {
      for (const item of args.items) {
        const action = item?.action as ActionData;

        await fn.setreg(args.denops, '"', action.text, "v");
        await fn.setreg(
          args.denops,
          await vars.v.get(args.denops, "register"),
          action.text,
          "v",
        );
      }

      return ActionFlags.Persist;
    },
  },
};

type Params = Record<string, never>;

export class Kind extends BaseKind<Params> {
  override actions = WordActions;

  override getPreviewer(args: {
    denops: Denops;
    item: DduItem;
    actionParams: BaseParams;
    previewContext: PreviewContext;
  }): Promise<Previewer | undefined> {
    const action = args.item.action as ActionData;
    if (!action) {
      return Promise.resolve(undefined);
    }

    return Promise.resolve({
      kind: "nofile",
      contents: (action.info ?? action.text).split("\n"),
    });
  }

  override params(): Params {
    return {};
  }
}

const paste = async (
  denops: Denops,
  mode: string,
  item: DduItem,
  pasteKey: string,
) => {
  const action = item?.action as ActionData;
  const modifiable = await op.modifiable.getLocal(denops);
  if (!action?.text || !modifiable) {
    return;
  }

  const regType = action.regType ?? "v";
  const oldReg = await fn.getreginfo(denops, '"');

  try {
    await fn.setreg(denops, '"', action.text, regType);
    await denops.cmd(`normal! ""${pasteKey}`);
  } finally {
    await fn.setreg(denops, '"', oldReg);
  }

  await postPaste(denops, mode, action.text);
};

const postPaste = async (
  denops: Denops,
  mode: string,
  text: string,
) => {
  if (mode === "i") {
    const textLen = await fn.strlen(denops, text) as number;
    await fn.cursor(denops, 0, await fn.col(denops, ".") + textLen);
  }

  await denops.cmd("normal! zv");
};

const feedWord = async (denops: Denops, item: DduItem) => {
  const action = item?.action as ActionData;
  if (!action?.text) {
    return;
  }

  await fn.feedkeys(denops, action.text, "n");
};
