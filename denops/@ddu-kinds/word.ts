import {
  ActionFlags,
  Actions,
  BaseKind,
  Context,
  DduItem,
  PreviewContext,
  Previewer,
} from "https://deno.land/x/ddu_vim@v3.0.2/types.ts";
import { Denops, fn, vars } from "https://deno.land/x/ddu_vim@v3.0.2/deps.ts";
import { DdcItem } from "https://deno.land/x/ddc_vim@v3.5.1/types.ts";

export type ActionData = {
  text: string;
  regType?: string;
  item?: DdcItem;
  info?: string;
};

type Params = Record<never, never>;

export class Kind extends BaseKind<Params> {
  override actions: Actions<Params> = {
    append: async (
      args: { denops: Denops; context: Context; items: DduItem[] },
    ) => {
      for (const item of args.items) {
        await paste(args.denops, args.context.mode, item, "p");
      }
      return Promise.resolve(ActionFlags.None);
    },
    complete: async (args: { denops: Denops; items: DduItem[] }) => {
      for (const item of args.items) {
        await feedkeys(args.denops, item);
        const completedItem = (item?.action as ActionData)?.item;
        if (!completedItem) {
          continue;
        }

        try {
          vars.g.set(args.denops, "completed_item", completedItem);
        } catch (_: unknown) {
          // Ignore
        }

        await args.denops.cmd("silent! doautocmd <nomodeline> CompleteDone");
      }
      return Promise.resolve(ActionFlags.None);
    },
    feedkeys: async (args: { denops: Denops; items: DduItem[] }) => {
      for (const item of args.items) {
        await feedkeys(args.denops, item);
      }
      return Promise.resolve(ActionFlags.None);
    },
    insert: async (
      args: { denops: Denops; context: Context; items: DduItem[] },
    ) => {
      for (const item of args.items) {
        await paste(args.denops, args.context.mode, item, "P");
      }
      return Promise.resolve(ActionFlags.None);
    },
  };

  override getPreviewer(args: {
    denops: Denops;
    item: DduItem;
    actionParams: unknown;
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

  if (action.text === undefined) {
    return;
  }

  const regType = action.regType ?? "v";

  const oldValue = fn.getreg(denops, '"');
  const oldType = fn.getregtype(denops, '"');

  await fn.setreg(denops, '"', action.text, regType);
  try {
    await denops.cmd('normal! ""' + pasteKey);
  } finally {
    await fn.setreg(denops, '"', oldValue, oldType);
  }

  if (mode === "i") {
    // Cursor move
    const textLen = await fn.strlen(denops, action.text) as number;
    await fn.cursor(denops, 0, await fn.col(denops, ".") + textLen);
  }

  // Open folds
  await denops.cmd("normal! zv");
};

const feedkeys = async (denops: Denops, item: DduItem) => {
  const action = item?.action as ActionData;

  if (action.text === undefined) {
    return;
  }

  // Use feedkeys() instead
  await fn.feedkeys(denops, action.text, "n");
};
