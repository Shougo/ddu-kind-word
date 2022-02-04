# ddu-kind-word

Word kind for ddu.vim

This kind implements word operations.

## Required

### denops.vim

https://github.com/vim-denops/denops.vim

### ddu.vim

https://github.com/Shougo/ddu.vim

## Configuration

```vim
call ddu#custom#patch_global({
    \   'kindOptions': {
    \     'word': {
    \       'defaultAction': 'append',
    \     },
    \   }
    \ })
```
