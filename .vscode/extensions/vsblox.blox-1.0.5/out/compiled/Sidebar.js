var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }
    class HtmlTag {
        constructor() {
            this.e = this.n = null;
        }
        c(html) {
            this.h(html);
        }
        m(html, target, anchor = null) {
            if (!this.e) {
                this.e = element(target.nodeName);
                this.t = target;
                this.c(html);
            }
            this.i(anchor);
        }
        h(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.childNodes);
        }
        i(anchor) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(this.t, this.n[i], anchor);
            }
        }
        p(html) {
            this.d();
            this.h(html);
            this.i(this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.43.1' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const capitalizeFirstLetter = (string) => {
      return string.charAt(0).toUpperCase() + string.slice(1);
    };

    const sortComponents = (tabs) => {
      // For three level of compnents

      return tabs
        .map((tab) => {
          let children = tab.children.map((category) => {
            if (!category.children[0].children) {
              let unlockedCategoryChildren = category.children.filter((item) => {
                return !item.locked;
              });
              let communityCategoryChildren = category.children.filter((item) => {
                if (item.locked && item.community) {
                  return true;
                }
                return false;
              });
              let lockedCategoryChildren = category.children.filter((item) => {
                if (item.locked && !item.community) {
                  return true;
                }
                return false;
              });
              return {
                ...category,
                children: [
                  ...unlockedCategoryChildren,
                  ...communityCategoryChildren,
                  ...lockedCategoryChildren,
                ],
              };
            }
            let categoryChildren = category.children.map((subCategory) => {
              let unlockedSubCategoryChildren = subCategory.children.filter(
                (item) => {
                  return !item.locked;
                }
              );
              let communitySubCategoryChildren = subCategory.children.filter(
                (item) => {
                  if (item.locked && item.community) {
                    return true;
                  }
                  return false;
                }
              );
              let lockedSubCategoryChildren = subCategory.children.filter(
                (item) => {
                  if (item.locked && !item.community) {
                    return true;
                  }
                  return false;
                }
              );
              return {
                ...subCategory,
                children: [
                  ...unlockedSubCategoryChildren,
                  ...communitySubCategoryChildren,
                  ...lockedSubCategoryChildren,
                ],
              };
            });
            return { ...category, children: [...categoryChildren] };
          });
          return { ...tab, children: [...children] };
        })
        .reverse();
    };

    const reduceTabs = (tabs) => {
      // For three level of compnents

      return tabs
        .map((tab) => {
          return tab.children.map((category) => {
            if (!category.children[0].children) {
              let unlockedCategoryChildren = category.children.filter((item) => {
                return !item.locked;
              });
              let communityCategoryChildren = category.children.filter((item) => {
                if (item.locked && item.community) {
                  return true;
                }
                return false;
              });

              let lockedCategoryChildren = category.children.filter((item) => {
                if (item.locked && !item.community) {
                  return true;
                }
                return false;
              });
              return [
                ...unlockedCategoryChildren,
                ...communityCategoryChildren,
                ...lockedCategoryChildren,
              ];
            }

            return category.children.map((subCategory) => {
              let unlockedSubCategoryChildren = subCategory.children.filter(
                (item) => {
                  return !item.locked;
                }
              );
              let communitySubCategoryChildren = subCategory.children.filter(
                (item) => {
                  if (item.locked && item.community) {
                    return true;
                  }
                  return false;
                }
              );
              let lockedSubCategoryChildren = subCategory.children.filter(
                (item) => {
                  if (item.locked && !item.community) {
                    return true;
                  }
                  return false;
                }
              );
              return [
                ...unlockedSubCategoryChildren,
                ...communitySubCategoryChildren,
                ...lockedSubCategoryChildren,
              ];
            });
          });
        })
        .reduce((reducedArray, element) => {
          return reducedArray.concat(element);
        }, [])
        .reduce((reducedArray, element) => {
          return reducedArray.concat(element);
        }, [])
        .reduce((reducedArray, element) => {
          return reducedArray.concat(element);
        }, []);
    };

    const passComponentToEditor = async (
      vscode,
      path,
      name,
      type,
      framework,
      token
    ) => {
      vscode.postMessage({
        type: "onMessage",
        message: "Downloading Component",
      });

      const data = {
        path: `${path}/${framework}`,
        type,
      };

      try {
        let res;
        const url =
          // "https://7jn82juu23.execute-api.us-west-1.amazonaws.com/dev/components/get";
          // "https://7jn82juu23.execute-api.us-west-1.amazonaws.com/dev/components/v2/get";
          "https://7jn82juu23.execute-api.us-west-1.amazonaws.com/dev/components/v2/get";

        if (!token) {
          res = await fetch(url, {
            method: "POST",
            body: JSON.stringify(data),
          });
        } else {
          res = await fetch(url, {
            method: "POST",
            headers: new Headers({
              Authorization: token,
              "Content-Type": "application/json",
            }),
            body: JSON.stringify(data),
          });
        }
        let responseData = await res.json();
        if (!responseData.success) {
          if (res.status === 401 && token) {
            vscode.postMessage({
              type: "removeToken",
            });
            vscode.postMessage({
              type: "refresh",
            });
            throw new Error(
              "Something went wrong with authorization. Please login again!"
            );
          }
          throw new Error(responseData.error.error);
        }
        vscode.postMessage({
          type: "passComponent",
          value: responseData.data,
          framework,
          componentName: name.replace(/ /g, ""),
        });
      } catch (error) {
        vscode.postMessage({
          type: "onError",
          message:
            error.message || "Unable to download the component, please try again",
        });
      }
    };

    const componentLocked = (vscode) => {
      vscode.postMessage({
        type: "componentLocked",
      });
    };

    /* webviews\components\Sidebar\AllComponents\CopyInput\CopyInput.svelte generated by Svelte v3.43.1 */

    const file$9 = "webviews\\components\\Sidebar\\AllComponents\\CopyInput\\CopyInput.svelte";

    function create_fragment$a(ctx) {
    	let div;
    	let input;
    	let input_value_value;
    	let t;
    	let button;
    	let svg;
    	let path0;
    	let path1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			input = element("input");
    			t = space();
    			button = element("button");
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			attr_dev(input, "id", "cdn");
    			attr_dev(input, "type", "text");
    			input.disabled = true;
    			input.value = input_value_value = /*isCopied*/ ctx[0] ? "Link copied!" : "Tailwind CDN";
    			attr_dev(input, "class", "svelte-5nc3es");
    			add_location(input, file$9, 17, 2, 399);
    			attr_dev(path0, "fill", "none");
    			attr_dev(path0, "d", "M0 0h24v24H0z");
    			add_location(path0, file$9, 30, 6, 711);
    			attr_dev(path1, "d", "M7 4V2h10v2h3.007c.548 0 .993.445.993.993v16.014a.994.994 0 0 1-.993.993H3.993A.994.994 0 0 1 3 21.007V4.993C3 4.445 3.445 4 3.993 4H7zm0 2H5v14h14V6h-2v2H7V6zm2-2v2h6V4H9z");
    			attr_dev(path1, "fill", "#949A98");
    			add_location(path1, file$9, 30, 44, 749);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			attr_dev(svg, "width", "16");
    			attr_dev(svg, "height", "16");
    			add_location(svg, file$9, 24, 4, 586);
    			attr_dev(button, "class", "btn-copy svelte-5nc3es");
    			attr_dev(button, "title", "Copy link");
    			add_location(button, file$9, 23, 2, 516);
    			attr_dev(div, "class", "cdn-input svelte-5nc3es");
    			add_location(div, file$9, 15, 0, 322);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input);
    			append_dev(div, t);
    			append_dev(div, button);
    			append_dev(button, svg);
    			append_dev(svg, path0);
    			append_dev(svg, path1);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*clipBoard*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*isCopied*/ 1 && input_value_value !== (input_value_value = /*isCopied*/ ctx[0] ? "Link copied!" : "Tailwind CDN") && input.value !== input_value_value) {
    				prop_dev(input, "value", input_value_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('CopyInput', slots, []);
    	let { vscode } = $$props;
    	let tailwindCDN = "https://cdn.tailwindcss.com";
    	let isCopied = false;

    	const clipBoard = () => {
    		navigator.clipboard.writeText(tailwindCDN);
    		$$invalidate(0, isCopied = true);

    		vscode.postMessage({
    			type: "onMessage",
    			message: "CDN copied!"
    		});
    	};

    	const writable_props = ['vscode'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<CopyInput> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('vscode' in $$props) $$invalidate(2, vscode = $$props.vscode);
    	};

    	$$self.$capture_state = () => ({ vscode, tailwindCDN, isCopied, clipBoard });

    	$$self.$inject_state = $$props => {
    		if ('vscode' in $$props) $$invalidate(2, vscode = $$props.vscode);
    		if ('tailwindCDN' in $$props) tailwindCDN = $$props.tailwindCDN;
    		if ('isCopied' in $$props) $$invalidate(0, isCopied = $$props.isCopied);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [isCopied, clipBoard, vscode];
    }

    class CopyInput extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, { vscode: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CopyInput",
    			options,
    			id: create_fragment$a.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*vscode*/ ctx[2] === undefined && !('vscode' in props)) {
    			console.warn("<CopyInput> was created without expected prop 'vscode'");
    		}
    	}

    	get vscode() {
    		throw new Error("<CopyInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set vscode(value) {
    		throw new Error("<CopyInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* webviews\components\UI\CustomSelect.svelte generated by Svelte v3.43.1 */

    const { Object: Object_1$1 } = globals;
    const file$8 = "webviews\\components\\UI\\CustomSelect.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i];
    	return child_ctx;
    }

    // (310:6) {:else}
    function create_else_block$5(ctx) {
    	let html_tag;
    	let raw_value = /*icons*/ ctx[5].chevronDown + "";
    	let html_anchor;

    	const block = {
    		c: function create() {
    			html_tag = new HtmlTag();
    			html_anchor = empty();
    			html_tag.a = html_anchor;
    		},
    		m: function mount(target, anchor) {
    			html_tag.m(raw_value, target, anchor);
    			insert_dev(target, html_anchor, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$5.name,
    		type: "else",
    		source: "(310:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (308:6) {#if showFrameworks}
    function create_if_block$6(ctx) {
    	let html_tag;
    	let raw_value = /*icons*/ ctx[5].chevronUp + "";
    	let html_anchor;

    	const block = {
    		c: function create() {
    			html_tag = new HtmlTag();
    			html_anchor = empty();
    			html_tag.a = html_anchor;
    		},
    		m: function mount(target, anchor) {
    			html_tag.m(raw_value, target, anchor);
    			insert_dev(target, html_anchor, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$6.name,
    		type: "if",
    		source: "(308:6) {#if showFrameworks}",
    		ctx
    	});

    	return block;
    }

    // (317:4) {#each Object.keys(frameworks) as frameworkKey}
    function create_each_block$2(ctx) {
    	let div;
    	let input;
    	let t0;
    	let label;
    	let t1_value = /*frameworks*/ ctx[4][/*frameworkKey*/ ctx[14]].text + "";
    	let t1;
    	let t2;
    	let html_tag;
    	let raw_value = /*frameworks*/ ctx[4][/*frameworkKey*/ ctx[14]].inActiveIcon + "";
    	let label_class_value;
    	let t3;
    	let div_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			input = element("input");
    			t0 = space();
    			label = element("label");
    			t1 = text(t1_value);
    			t2 = space();
    			html_tag = new HtmlTag();
    			t3 = space();
    			attr_dev(input, "type", "radio");
    			input.__value = /*frameworks*/ ctx[4][/*frameworkKey*/ ctx[14]].value;
    			input.value = input.__value;
    			attr_dev(input, "name", "framework");
    			attr_dev(input, "id", /*frameworks*/ ctx[4][/*frameworkKey*/ ctx[14]].text);
    			attr_dev(input, "class", "svelte-18p2pku");
    			/*$$binding_groups*/ ctx[12][0].push(input);
    			add_location(input, file$8, 324, 8, 13679);
    			html_tag.a = null;
    			attr_dev(label, "for", /*frameworks*/ ctx[4][/*frameworkKey*/ ctx[14]].text);

    			attr_dev(label, "class", label_class_value = "" + (null_to_empty(/*frameworks*/ ctx[4][/*frameworkKey*/ ctx[14]].value === /*selectedFramework*/ ctx[0]
    			? "label--active"
    			: "") + " svelte-18p2pku"));

    			add_location(label, file$8, 332, 8, 13937);

    			attr_dev(div, "class", div_class_value = "" + (null_to_empty(`option ${/*frameworks*/ ctx[4][/*frameworkKey*/ ctx[14]].value === /*selectedFramework*/ ctx[0]
			? "option--active"
			: ""}`) + " svelte-18p2pku"));

    			add_location(div, file$8, 317, 6, 13502);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input);
    			input.checked = input.__value === /*selectedFramework*/ ctx[0];
    			append_dev(div, t0);
    			append_dev(div, label);
    			append_dev(label, t1);
    			append_dev(label, t2);
    			html_tag.m(raw_value, label);
    			append_dev(div, t3);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "change", /*input_change_handler_1*/ ctx[11]),
    					listen_dev(input, "click", /*onChangeFramework*/ ctx[6], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*selectedFramework*/ 1) {
    				input.checked = input.__value === /*selectedFramework*/ ctx[0];
    			}

    			if (dirty & /*selectedFramework*/ 1 && label_class_value !== (label_class_value = "" + (null_to_empty(/*frameworks*/ ctx[4][/*frameworkKey*/ ctx[14]].value === /*selectedFramework*/ ctx[0]
    			? "label--active"
    			: "") + " svelte-18p2pku"))) {
    				attr_dev(label, "class", label_class_value);
    			}

    			if (dirty & /*selectedFramework*/ 1 && div_class_value !== (div_class_value = "" + (null_to_empty(`option ${/*frameworks*/ ctx[4][/*frameworkKey*/ ctx[14]].value === /*selectedFramework*/ ctx[0]
			? "option--active"
			: ""}`) + " svelte-18p2pku"))) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*$$binding_groups*/ ctx[12][0].splice(/*$$binding_groups*/ ctx[12][0].indexOf(input), 1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(317:4) {#each Object.keys(frameworks) as frameworkKey}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let div2;
    	let div0;
    	let input;
    	let t0;
    	let label;
    	let html_tag;
    	let raw_value = /*frameworks*/ ctx[4][/*selectedFramework*/ ctx[0]].inActiveIcon + "";
    	let t1;
    	let span;
    	let t2_value = /*frameworks*/ ctx[4][/*selectedFramework*/ ctx[0]].text + "";
    	let t2;
    	let t3;
    	let t4;
    	let div1;
    	let div1_class_value;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*showFrameworks*/ ctx[1]) return create_if_block$6;
    		return create_else_block$5;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);
    	let each_value = Object.keys(/*frameworks*/ ctx[4]);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			input = element("input");
    			t0 = space();
    			label = element("label");
    			html_tag = new HtmlTag();
    			t1 = space();
    			span = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			if_block.c();
    			t4 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "id", "selected-option");
    			attr_dev(input, "class", "svelte-18p2pku");
    			add_location(input, file$8, 295, 4, 12826);
    			html_tag.a = t1;
    			attr_dev(span, "class", "svelte-18p2pku");
    			add_location(span, file$8, 306, 6, 13169);
    			attr_dev(label, "for", "selected-option");
    			attr_dev(label, "class", "svelte-18p2pku");
    			add_location(label, file$8, 304, 4, 13047);
    			attr_dev(div0, "class", "selected-option-container svelte-18p2pku");
    			add_location(div0, file$8, 294, 2, 12781);
    			attr_dev(div1, "class", div1_class_value = "" + (null_to_empty(`options ${!/*showFrameworks*/ ctx[1] ? "options--disabled" : ""}`) + " svelte-18p2pku"));
    			add_location(div1, file$8, 315, 2, 13372);
    			attr_dev(div2, "class", "custom-select svelte-18p2pku");
    			add_location(div2, file$8, 293, 0, 12750);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, input);
    			input.checked = /*showFrameworks*/ ctx[1];
    			/*input_binding*/ ctx[9](input);
    			append_dev(div0, t0);
    			append_dev(div0, label);
    			html_tag.m(raw_value, label);
    			append_dev(label, t1);
    			append_dev(label, span);
    			append_dev(span, t2);
    			append_dev(label, t3);
    			if_block.m(label, null);
    			/*label_binding*/ ctx[10](label);
    			append_dev(div2, t4);
    			append_dev(div2, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "change", /*change_handler*/ ctx[7], false, false, false),
    					listen_dev(input, "change", /*input_change_handler*/ ctx[8])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*showFrameworks*/ 2) {
    				input.checked = /*showFrameworks*/ ctx[1];
    			}

    			if (dirty & /*selectedFramework*/ 1 && raw_value !== (raw_value = /*frameworks*/ ctx[4][/*selectedFramework*/ ctx[0]].inActiveIcon + "")) html_tag.p(raw_value);
    			if (dirty & /*selectedFramework*/ 1 && t2_value !== (t2_value = /*frameworks*/ ctx[4][/*selectedFramework*/ ctx[0]].text + "")) set_data_dev(t2, t2_value);

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(label, null);
    				}
    			}

    			if (dirty & /*frameworks, Object, selectedFramework, onChangeFramework*/ 81) {
    				each_value = Object.keys(/*frameworks*/ ctx[4]);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*showFrameworks*/ 2 && div1_class_value !== (div1_class_value = "" + (null_to_empty(`options ${!/*showFrameworks*/ ctx[1] ? "options--disabled" : ""}`) + " svelte-18p2pku"))) {
    				attr_dev(div1, "class", div1_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			/*input_binding*/ ctx[9](null);
    			if_block.d();
    			/*label_binding*/ ctx[10](null);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('CustomSelect', slots, []);
    	let { selectedFramework = "html" } = $$props;
    	let showFrameworks = false;
    	let selectLabelRef;
    	let selectInputRef;
    	const dispatch = createEventDispatcher();

    	const frameworks = {
    		html: {
    			text: "Tailwind CSS",
    			value: "html",
    			inActiveIcon: `<svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M12 6C9.6 6 8.1 7.30909 7.5 9.92727C8.4 8.61818 9.45 8.12727 10.65 8.45455C11.3347 8.64109 11.824 9.18327 12.3657 9.78291C13.248 10.76 14.2693 11.8909 16.5 11.8909C18.9 11.8909 20.4 10.5818 21 7.96364C20.1 9.27273 19.05 9.76364 17.85 9.43636C17.1653 9.24982 16.676 8.70764 16.1343 8.108C15.252 7.13091 14.2307 6 12 6ZM7.5 11.8909C5.1 11.8909 3.6 13.2 3 15.8182C3.9 14.5091 4.95 14.0182 6.15 14.3455C6.83467 14.5324 7.324 15.0742 7.86567 15.6738C8.748 16.6509 9.76933 17.7818 12 17.7818C14.4 17.7818 15.9 16.4727 16.5 13.8545C15.6 15.1636 14.55 15.6545 13.35 15.3273C12.6653 15.1407 12.176 14.5985 11.6343 13.9989C10.752 13.0218 9.73067 11.8909 7.5 11.8909Z"
              fill="#7F8483"
            />
          </svg>`
    		},
    		angular: {
    			text: "Angular",
    			value: "angular",
    			inActiveIcon: `<svg
        class="radio-icon"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12.0002 2L21.3002 5.32L19.8822 17.63L12.0002 22L4.1182 17.63L2.7002 5.32L12.0002 2ZM12.0002 4.21L6.1862 17.26H8.3542L9.5232 14.34H14.4572L15.6272 17.26H17.7942L12.0002 4.21ZM13.6982 12.54H10.3022L12.0002 8.45L13.6982 12.54Z"
          fill="#7F8483"
        />
      </svg>`
    		},
    		react: {
    			text: "React",
    			value: "react",
    			inActiveIcon: `<svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <path
          d="M14.448 16.2401C13.9125 17.0015 13.329 17.728 12.701 18.4151C14.373 20.0381 15.929 20.7981 16.791 20.2991C17.655 19.8011 17.774 18.0741 17.205 15.8151C16.352 16.0051 15.425 16.1491 14.448 16.2401V16.2401ZM13.138 16.3271C12.3797 16.3585 11.6203 16.3585 10.862 16.3271C11.239 16.8191 11.62 17.2751 12 17.6911C12.38 17.2751 12.76 16.8191 13.138 16.3271ZM18.178 8.43308C20.843 9.19708 22.583 10.4671 22.583 12.0001C22.583 13.5331 20.843 14.8031 18.178 15.5671C18.848 18.2571 18.619 20.3991 17.292 21.1651C15.964 21.9321 13.994 21.0601 12 19.1351C10.006 21.0601 8.03599 21.9321 6.70799 21.1651C5.38099 20.3991 5.15099 18.2571 5.82199 15.5671C3.15699 14.8031 1.41699 13.5331 1.41699 12.0001C1.41699 10.4671 3.15699 9.19708 5.82199 8.43308C5.15199 5.74308 5.38099 3.60108 6.70799 2.83508C8.03599 2.06808 10.006 2.94008 12 4.86508C13.994 2.94008 15.964 2.06808 17.292 2.83508C18.619 3.60108 18.849 5.74308 18.178 8.43308V8.43308ZM17.205 8.18508C17.775 5.92508 17.655 4.19908 16.792 3.70108C15.929 3.20208 14.373 3.96208 12.702 5.58508C13.293 6.22808 13.881 6.95908 14.448 7.76008C15.426 7.85008 16.352 7.99408 17.205 8.18508ZM6.79499 15.8151C6.22499 18.0751 6.34499 19.8011 7.20799 20.2991C8.07099 20.7981 9.62699 20.0381 11.298 18.4151C10.6703 17.728 10.0871 17.0015 9.55199 16.2401C8.62489 16.1572 7.70402 16.0153 6.79499 15.8151V15.8151ZM10.862 7.67308C11.6203 7.64169 12.3797 7.64169 13.138 7.67308C12.7785 7.20254 12.3988 6.74778 12 6.31008C11.62 6.72608 11.24 7.18208 10.862 7.67408V7.67308ZM9.55199 7.76008C10.0878 6.99862 10.6716 6.27215 11.3 5.58508C9.62699 3.96208 8.06999 3.20208 7.20899 3.70108C6.34499 4.19908 6.22599 5.92608 6.79499 8.18508C7.64799 7.99508 8.57499 7.85108 9.55199 7.76008V7.76008ZM13.894 15.2801C14.6058 14.2354 15.2386 13.1391 15.787 12.0001C15.2386 10.8611 14.6058 9.76472 13.894 8.72008C12.6331 8.62568 11.3669 8.62568 10.106 8.72008C9.39415 9.76472 8.76139 10.8611 8.21299 12.0001C8.76139 13.1391 9.39415 14.2354 10.106 15.2801C11.3669 15.3745 12.6331 15.3745 13.894 15.2801V15.2801ZM15.178 15.1491C15.793 15.0691 16.378 14.9661 16.928 14.8451C16.7481 14.2808 16.5439 13.7247 16.316 13.1781C15.964 13.8502 15.5843 14.5074 15.178 15.1481V15.1491ZM8.82199 8.85008C8.20699 8.93008 7.62199 9.03308 7.07199 9.15408C7.24199 9.69008 7.44599 10.2481 7.68399 10.8211C8.036 10.149 8.41566 9.49178 8.82199 8.85108V8.85008ZM7.07199 14.8441C7.62199 14.9651 8.20699 15.0671 8.82199 15.1481C8.41566 14.5074 8.036 13.8502 7.68399 13.1781C7.44599 13.7501 7.24199 14.3081 7.07199 14.8441ZM6.09399 14.5991C6.35499 13.7651 6.69399 12.8911 7.10399 11.9991C6.69399 11.1071 6.35499 10.2331 6.09399 9.39908C3.85199 10.0361 2.41699 11.0031 2.41699 11.9991C2.41699 12.9951 3.85199 13.9621 6.09399 14.5991ZM16.928 9.15408C16.378 9.03308 15.793 8.93108 15.178 8.85008C15.5843 9.49078 15.964 10.148 16.316 10.8201C16.554 10.2481 16.758 9.69008 16.928 9.15408V9.15408ZM17.906 9.39908C17.645 10.2331 17.306 11.1071 16.896 11.9991C17.306 12.8911 17.645 13.7651 17.906 14.5991C20.148 13.9621 21.583 12.9951 21.583 11.9991C21.583 11.0031 20.148 10.0361 17.906 9.39908ZM12 13.8801C11.7531 13.8801 11.5086 13.8315 11.2805 13.737C11.0525 13.6425 10.8452 13.504 10.6706 13.3294C10.4961 13.1549 10.3576 12.9476 10.2631 12.7195C10.1686 12.4914 10.12 12.247 10.12 12.0001C10.12 11.7532 10.1686 11.5087 10.2631 11.2806C10.3576 11.0525 10.4961 10.8453 10.6706 10.6707C10.8452 10.4961 11.0525 10.3577 11.2805 10.2632C11.5086 10.1687 11.7531 10.1201 12 10.1201C12.4986 10.1201 12.9768 10.3182 13.3294 10.6707C13.6819 11.0233 13.88 11.5015 13.88 12.0001C13.88 12.4987 13.6819 12.9769 13.3294 13.3294C12.9768 13.682 12.4986 13.8801 12 13.8801V13.8801Z"
          fill="#7F8483"/>
      </svg>`
    		},
    		vue: {
    			text: "Vue",
    			value: "vue",
    			inActiveIcon: `<svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <path
          d="M1 3H5L12 15L19 3H23L12 22L1 3ZM9.667 3L12 7L14.333 3H18.368L12 14L5.632 3H9.667Z"
          fill="#7F8483"
        />
      </svg>`
    		}
    	};

    	const icons = {
    		chevronUp: `<svg xmlns="http://www.w3.org/2000/svg" class="dropdown-icon" viewBox="0 0 512 512"><style>.dropdown-icon{width:15px; position:absolute; right:10px; }</style><title>Chevron Up</title><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M112 328l144-144 144 144"/></svg>`,
    		chevronDown: `<svg xmlns="http://www.w3.org/2000/svg" class="dropdown-icon" viewBox="0 0 512 512"><style>.dropdown-icon{width:15px; position:absolute; right:10px; }</style><title>Chevron Down</title><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M112 184l144 144 144-144"/></svg>`
    	};

    	const onChangeFramework = event => {
    		$$invalidate(1, showFrameworks = !showFrameworks);
    		dispatch("onChangeFramework", { selectedFramework: event.target.value });
    	};

    	window.addEventListener("click", event => {
    		if (event.target !== selectInputRef && event.target !== selectLabelRef) {
    			$$invalidate(1, showFrameworks = false);
    		}
    	});

    	const writable_props = ['selectedFramework'];

    	Object_1$1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<CustomSelect> was created with unknown prop '${key}'`);
    	});

    	const $$binding_groups = [[]];

    	const change_handler = () => {
    		$$invalidate(1, showFrameworks = !showFrameworks);
    	};

    	function input_change_handler() {
    		showFrameworks = this.checked;
    		$$invalidate(1, showFrameworks);
    	}

    	function input_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			selectInputRef = $$value;
    			$$invalidate(3, selectInputRef);
    		});
    	}

    	function label_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			selectLabelRef = $$value;
    			$$invalidate(2, selectLabelRef);
    		});
    	}

    	function input_change_handler_1() {
    		selectedFramework = this.__value;
    		$$invalidate(0, selectedFramework);
    	}

    	$$self.$$set = $$props => {
    		if ('selectedFramework' in $$props) $$invalidate(0, selectedFramework = $$props.selectedFramework);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		selectedFramework,
    		showFrameworks,
    		selectLabelRef,
    		selectInputRef,
    		dispatch,
    		frameworks,
    		icons,
    		onChangeFramework
    	});

    	$$self.$inject_state = $$props => {
    		if ('selectedFramework' in $$props) $$invalidate(0, selectedFramework = $$props.selectedFramework);
    		if ('showFrameworks' in $$props) $$invalidate(1, showFrameworks = $$props.showFrameworks);
    		if ('selectLabelRef' in $$props) $$invalidate(2, selectLabelRef = $$props.selectLabelRef);
    		if ('selectInputRef' in $$props) $$invalidate(3, selectInputRef = $$props.selectInputRef);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		selectedFramework,
    		showFrameworks,
    		selectLabelRef,
    		selectInputRef,
    		frameworks,
    		icons,
    		onChangeFramework,
    		change_handler,
    		input_change_handler,
    		input_binding,
    		label_binding,
    		input_change_handler_1,
    		$$binding_groups
    	];
    }

    class CustomSelect extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { selectedFramework: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CustomSelect",
    			options,
    			id: create_fragment$9.name
    		});
    	}

    	get selectedFramework() {
    		throw new Error("<CustomSelect>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set selectedFramework(value) {
    		throw new Error("<CustomSelect>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* webviews\components\Sidebar\AllComponents\ComponentItem\ComponentItem.svelte generated by Svelte v3.43.1 */

    const file$7 = "webviews\\components\\Sidebar\\AllComponents\\ComponentItem\\ComponentItem.svelte";

    // (130:6) {:else}
    function create_else_block_1$2(ctx) {
    	let p;
    	let t0;
    	let t1_value = capitalizeFirstLetter(/*framework*/ ctx[1]) + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("This component is not available for ");
    			t1 = text(t1_value);
    			t2 = text(".");
    			attr_dev(p, "class", "not-available svelte-lcca6u");
    			add_location(p, file$7, 130, 8, 13425);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*framework*/ 2 && t1_value !== (t1_value = capitalizeFirstLetter(/*framework*/ ctx[1]) + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1$2.name,
    		type: "else",
    		source: "(130:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (68:59) 
    function create_if_block_3$1(ctx) {
    	let div;
    	let button;
    	let t;
    	let mounted;
    	let dispose;

    	function select_block_type_1(ctx, dirty) {
    		if (/*component*/ ctx[0].locked) return create_if_block_4$1;
    		if (/*framework*/ ctx[1] === "angular") return create_if_block_5;
    		return create_else_block$4;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			button = element("button");
    			t = space();
    			if_block.c();
    			attr_dev(button, "class", "btn-preview svelte-lcca6u");
    			add_location(button, file$7, 69, 10, 11246);
    			attr_dev(div, "class", "buttons svelte-lcca6u");
    			add_location(div, file$7, 68, 8, 11213);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button);
    			button.innerHTML = /*zoomIcon*/ ctx[2];
    			append_dev(div, t);
    			if_block.m(div, null);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_1*/ ctx[15], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(68:59) ",
    		ctx
    	});

    	return block;
    }

    // (52:6) {#if component.locked && component.community}
    function create_if_block_2$2(ctx) {
    	let div;
    	let h4;
    	let t1;
    	let p;
    	let t3;
    	let button;
    	let span;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h4 = element("h4");
    			h4.textContent = "Signup to Get Access";
    			t1 = space();
    			p = element("p");
    			p.textContent = "250 free components for Community Users";
    			t3 = space();
    			button = element("button");
    			span = element("span");
    			span.textContent = "FREE Signup";
    			attr_dev(h4, "class", "community__heading svelte-lcca6u");
    			add_location(h4, file$7, 53, 10, 10643);
    			attr_dev(p, "class", "community__paragraph svelte-lcca6u");
    			add_location(p, file$7, 54, 10, 10711);
    			attr_dev(span, "class", "community__button-text svelte-lcca6u");
    			add_location(span, file$7, 64, 12, 11048);
    			attr_dev(button, "class", "community__button svelte-lcca6u");
    			add_location(button, file$7, 57, 10, 10824);
    			attr_dev(div, "class", "community svelte-lcca6u");
    			add_location(div, file$7, 52, 8, 10608);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h4);
    			append_dev(div, t1);
    			append_dev(div, p);
    			append_dev(div, t3);
    			append_dev(div, button);
    			append_dev(button, span);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[14], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$2.name,
    		type: "if",
    		source: "(52:6) {#if component.locked && component.community}",
    		ctx
    	});

    	return block;
    }

    // (103:10) {:else}
    function create_else_block$4(ctx) {
    	let button;
    	let html_tag;

    	let raw_value = (/*framework*/ ctx[1] === "html"
    	? /*htmlIcon*/ ctx[5]
    	: /*framework*/ ctx[1] === "react"
    		? /*reactIcon*/ ctx[7]
    		: /*vueIcon*/ ctx[6]) + "";

    	let span;
    	let t0;

    	let t1_value = (/*framework*/ ctx[1] === "html"
    	? "HTML"
    	: /*framework*/ ctx[1] === "react" ? "React" : "Vue") + "";

    	let t1;
    	let t2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			html_tag = new HtmlTag();
    			span = element("span");
    			t0 = text("Get ");
    			t1 = text(t1_value);
    			t2 = text(" code");
    			html_tag.a = span;
    			attr_dev(span, "class", "svelte-lcca6u");
    			add_location(span, file$7, 119, 26, 13139);
    			attr_dev(button, "class", "btn-import svelte-lcca6u");
    			add_location(button, file$7, 103, 12, 12535);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			html_tag.m(raw_value, button);
    			append_dev(button, span);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			append_dev(span, t2);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_5*/ ctx[19], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*framework*/ 2 && raw_value !== (raw_value = (/*framework*/ ctx[1] === "html"
    			? /*htmlIcon*/ ctx[5]
    			: /*framework*/ ctx[1] === "react"
    				? /*reactIcon*/ ctx[7]
    				: /*vueIcon*/ ctx[6]) + "")) html_tag.p(raw_value);

    			if (dirty & /*framework*/ 2 && t1_value !== (t1_value = (/*framework*/ ctx[1] === "html"
    			? "HTML"
    			: /*framework*/ ctx[1] === "react" ? "React" : "Vue") + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$4.name,
    		type: "else",
    		source: "(103:10) {:else}",
    		ctx
    	});

    	return block;
    }

    // (86:44) 
    function create_if_block_5(ctx) {
    	let div;
    	let button0;
    	let html_tag;
    	let span0;
    	let t1;
    	let button1;
    	let html_tag_1;
    	let span1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button0 = element("button");
    			html_tag = new HtmlTag();
    			span0 = element("span");
    			span0.textContent = "Get HTML code";
    			t1 = space();
    			button1 = element("button");
    			html_tag_1 = new HtmlTag();
    			span1 = element("span");
    			span1.textContent = "Get TypeScript code";
    			html_tag.a = span0;
    			attr_dev(span0, "class", "svelte-lcca6u");
    			add_location(span0, file$7, 92, 35, 12116);
    			attr_dev(button0, "class", "btn-import svelte-lcca6u");
    			add_location(button0, file$7, 87, 14, 11870);
    			html_tag_1.a = span1;
    			attr_dev(span1, "class", "svelte-lcca6u");
    			add_location(span1, file$7, 99, 33, 12425);
    			attr_dev(button1, "class", "btn-import svelte-lcca6u");
    			add_location(button1, file$7, 94, 14, 12183);
    			attr_dev(div, "class", "import-buttons");
    			add_location(div, file$7, 86, 12, 11826);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button0);
    			html_tag.m(/*htmlIcon*/ ctx[5], button0);
    			append_dev(button0, span0);
    			append_dev(div, t1);
    			append_dev(div, button1);
    			html_tag_1.m(/*tsIcon*/ ctx[4], button1);
    			append_dev(button1, span1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler_3*/ ctx[17], false, false, false),
    					listen_dev(button1, "click", /*click_handler_4*/ ctx[18], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(86:44) ",
    		ctx
    	});

    	return block;
    }

    // (79:10) {#if component.locked}
    function create_if_block_4$1(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			attr_dev(button, "class", "btn-lock svelte-lcca6u");
    			add_location(button, file$7, 79, 12, 11596);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			button.innerHTML = /*lockIcon*/ ctx[3];

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_2*/ ctx[16], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4$1.name,
    		type: "if",
    		source: "(79:10) {#if component.locked}",
    		ctx
    	});

    	return block;
    }

    // (152:4) {#if component.locked && !component.community}
    function create_if_block_1$2(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "PRO";
    			attr_dev(span, "class", "locked svelte-lcca6u");
    			add_location(span, file$7, 152, 6, 14044);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(152:4) {#if component.locked && !component.community}",
    		ctx
    	});

    	return block;
    }

    // (155:4) {#if component.locked && component.community}
    function create_if_block$5(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "COMMUNITY";
    			attr_dev(span, "class", "community__badge svelte-lcca6u");
    			add_location(span, file$7, 155, 6, 14145);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(155:4) {#if component.locked && component.community}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$8(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let show_if;
    	let t0;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t1;
    	let p;
    	let t2_value = /*component*/ ctx[0].name.replace(/([A-Z])/g, " $1").replaceAll("_", " ").trim() + "";
    	let t2;
    	let t3;
    	let t4;
    	let div2_class_value;
    	let t5;
    	let hr;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*component*/ ctx[0].locked && /*component*/ ctx[0].community) return create_if_block_2$2;
    		if (show_if == null || dirty & /*component, framework*/ 3) show_if = !!/*component*/ ctx[0].integrations.includes(/*framework*/ ctx[1]);
    		if (show_if) return create_if_block_3$1;
    		return create_else_block_1$2;
    	}

    	let current_block_type = select_block_type(ctx, -1);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*component*/ ctx[0].locked && !/*component*/ ctx[0].community && create_if_block_1$2(ctx);
    	let if_block2 = /*component*/ ctx[0].locked && /*component*/ ctx[0].community && create_if_block$5(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			if_block0.c();
    			t0 = space();
    			img = element("img");
    			t1 = space();
    			p = element("p");
    			t2 = text(t2_value);
    			t3 = space();
    			if (if_block1) if_block1.c();
    			t4 = space();
    			if (if_block2) if_block2.c();
    			t5 = space();
    			hr = element("hr");
    			attr_dev(div0, "class", "backdrop svelte-lcca6u");
    			add_location(div0, file$7, 43, 4, 10397);
    			if (!src_url_equal(img.src, img_src_value = `https://cdn.tuk.dev/previews/blox-components-previews/${/*component*/ ctx[0].name}.jpg`)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*component*/ ctx[0].name.replace(/([A-Z])/g, " $1").replaceAll("_", " ").trim());
    			attr_dev(img, "loading", "lazy");
    			attr_dev(img, "class", "svelte-lcca6u");
    			add_location(img, file$7, 137, 4, 13604);
    			attr_dev(div1, "class", "component-container svelte-lcca6u");
    			add_location(div1, file$7, 42, 2, 10358);
    			attr_dev(p, "class", "component-title svelte-lcca6u");
    			add_location(p, file$7, 146, 2, 13856);
    			attr_dev(div2, "class", div2_class_value = "component-item " + (/*component*/ ctx[0].locked ? 'content-locked' : '') + " svelte-lcca6u");
    			add_location(div2, file$7, 41, 0, 10283);
    			attr_dev(hr, "class", "svelte-lcca6u");
    			add_location(hr, file$7, 159, 0, 14221);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			if_block0.m(div0, null);
    			append_dev(div1, t0);
    			append_dev(div1, img);
    			append_dev(div2, t1);
    			append_dev(div2, p);
    			append_dev(p, t2);
    			append_dev(p, t3);
    			if (if_block1) if_block1.m(p, null);
    			append_dev(p, t4);
    			if (if_block2) if_block2.m(p, null);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, hr, anchor);

    			if (!mounted) {
    				dispose = listen_dev(div0, "click", /*click_handler_6*/ ctx[20], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx, dirty)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div0, null);
    				}
    			}

    			if (dirty & /*component*/ 1 && !src_url_equal(img.src, img_src_value = `https://cdn.tuk.dev/previews/blox-components-previews/${/*component*/ ctx[0].name}.jpg`)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*component*/ 1 && img_alt_value !== (img_alt_value = /*component*/ ctx[0].name.replace(/([A-Z])/g, " $1").replaceAll("_", " ").trim())) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (dirty & /*component*/ 1 && t2_value !== (t2_value = /*component*/ ctx[0].name.replace(/([A-Z])/g, " $1").replaceAll("_", " ").trim() + "")) set_data_dev(t2, t2_value);

    			if (/*component*/ ctx[0].locked && !/*component*/ ctx[0].community) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_1$2(ctx);
    					if_block1.c();
    					if_block1.m(p, t4);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*component*/ ctx[0].locked && /*component*/ ctx[0].community) {
    				if (if_block2) ; else {
    					if_block2 = create_if_block$5(ctx);
    					if_block2.c();
    					if_block2.m(p, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (dirty & /*component*/ 1 && div2_class_value !== (div2_class_value = "component-item " + (/*component*/ ctx[0].locked ? 'content-locked' : '') + " svelte-lcca6u")) {
    				attr_dev(div2, "class", div2_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(hr);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ComponentItem', slots, []);
    	let { vscode } = $$props;
    	let { component } = $$props;
    	let { framework } = $$props;
    	let { token = null } = $$props;
    	const zoomIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="icon-tabler-zoom-in" width="25" height="25" viewBox="0 0 24 24" stroke-width="1.5" stroke="white" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><circle cx="10" cy="10" r="7" /><line x1="7" y1="10" x2="13" y2="10" /><line x1="10" y1="7" x2="10" y2="13" /><line x1="21" y1="21" x2="15" y2="15" /></svg>`;
    	const lockIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="icon-tabler-lock" width="25" height="25" viewBox="0 0 24 24" stroke-width="1.5" stroke="white" fill="none" stroke-linecap="round" stroke-linejoin="round">   <path stroke="none" d="M0 0h24v24H0z" fill="none"/>   <rect x="5" y="11" width="14" height="10" rx="2" />   <circle cx="12" cy="16" r="1" />   <path d="M8 11v-4a4 4 0 0 1 8 0v4" /> </svg>`;
    	const tsIcon = `<svg width="30" height="30" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_843:3402)"><path d="M19.2766 0.714287H2.72304C1.61354 0.714287 0.714111 1.61371 0.714111 2.72322V19.2768C0.714111 20.3863 1.61354 21.2857 2.72304 21.2857H19.2766C20.3861 21.2857 21.2855 20.3863 21.2855 19.2768V2.72322C21.2855 1.61371 20.3861 0.714287 19.2766 0.714287Z" fill="#3178C6"/><path fill-rule="evenodd" clip-rule="evenodd" d="M13.4506 17.067V19.0759C13.7761 19.2446 14.1738 19.3692 14.6158 19.4536C15.0578 19.5379 15.5399 19.5781 16.022 19.5781C16.5042 19.5781 16.9461 19.5339 17.3881 19.4415C17.8301 19.3491 18.1917 19.1964 18.5131 18.9996C18.8386 18.7866 19.1158 18.5174 19.2765 18.1558C19.4372 17.7942 19.5618 17.3924 19.5618 16.8701C19.5618 16.5045 19.5055 16.1871 19.397 15.9058C19.2886 15.6246 19.1319 15.3835 18.9149 15.1826C18.71 14.9696 18.4729 14.7808 18.1917 14.6201C17.9104 14.4594 17.589 14.2906 17.2274 14.1379C16.9622 14.0295 16.7453 13.925 16.5042 13.8205C16.2953 13.7161 16.1145 13.6116 15.9819 13.5071C15.8332 13.3987 15.7207 13.2862 15.6403 13.1696C15.56 13.0491 15.5198 12.9165 15.5198 12.7679C15.5198 12.6313 15.5556 12.5067 15.6283 12.3942C15.701 12.2817 15.8011 12.1893 15.9296 12.1089C16.0582 12.0286 16.2189 11.9683 16.4118 11.9241C16.6006 11.8799 16.8095 11.8598 17.0546 11.8598C17.2234 11.8598 17.4002 11.8723 17.577 11.8976C17.7618 11.9229 17.9506 11.9619 18.1395 12.0141C18.3283 12.0663 18.5131 12.1306 18.702 12.211C18.8787 12.2913 19.0435 12.3838 19.1841 12.4882V10.5998C18.8787 10.4833 18.5412 10.3949 18.1796 10.3387C17.818 10.2824 17.4162 10.2543 16.9341 10.2543C16.452 10.2543 16.01 10.3065 15.568 10.407C15.1261 10.5074 14.7645 10.6681 14.443 10.8891C14.1176 11.1061 13.8805 11.3713 13.6796 11.7329C13.4908 12.0704 13.3984 12.4561 13.3984 12.9382C13.3984 13.5409 13.5711 14.0632 13.9207 14.465C14.2662 14.907 14.8046 15.2284 15.4877 15.5498C15.7649 15.6623 16.01 15.7748 16.2511 15.8833C16.4921 15.9918 16.693 16.1043 16.8537 16.2208C17.0265 16.3373 17.1631 16.4659 17.2555 16.6025C17.356 16.7391 17.4082 16.8998 17.4082 17.0846C17.4082 17.2132 17.3769 17.3338 17.3158 17.4463C17.2547 17.5588 17.1591 17.6552 17.0305 17.7355C16.902 17.8159 16.7453 17.8802 16.5484 17.9284C16.3595 17.9726 16.1466 17.9967 15.8653 17.9967C15.4234 17.9967 14.9814 17.9204 14.5796 17.7677C14.1377 17.615 13.7359 17.386 13.3743 17.0846L13.4506 17.067ZM10.0756 12.125H12.647V10.4777H5.45508V12.125H8.02651V19.4777H10.0756V12.125Z" fill="white"/></g><defs><clipPath id="clip0_843:3402"><rect width="20.5714" height="20.5714" fill="white" transform="translate(0.714111 0.714287)"/></clipPath></defs></svg>`;
    	const htmlIcon = `<svg width="30" height="30" viewBox="0 0 19 22" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_843:3347)"><path d="M1.6317 19.2336L-0.0200195 0.694267H18.1389L16.4872 19.2236L9.04443 21.2857" fill="#E44D26"/><path d="M9.05933 19.7091V2.21585H16.4821L15.0656 18.0323" fill="#F16529"/><path d="M3.35352 4.48322H9.05946V6.75558H5.84611L6.05633 9.08301H9.05946V11.3504H3.97416L3.35352 4.48322ZM4.07427 12.4916H6.35665L6.51681 14.3084L9.05946 14.9892V17.3616L4.3946 16.0603" fill="#EBEBEB"/><path d="M14.7452 4.48322H9.04932V6.75558H14.535L14.7452 4.48322ZM14.3298 9.08301H9.04932V11.3554H11.8522L11.587 14.3085L9.04932 14.9892V17.3516L13.7041 16.0603" fill="white"/></g><defs><clipPath id="clip0_843:3347"><rect width="18.1189" height="20.5714" fill="white" transform="translate(0 0.714287)"/></clipPath></defs></svg>`;
    	const vueIcon = `<svg width="30" height="30" viewBox="0 0 24 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.2129 8.45085e-05L11.5463 4.61879L8.87967 8.45085e-05H-0.000488281L11.5463 19.9999L23.093 8.45085e-05H14.2129Z" fill="#41B883"/><path d="M14.2131 5.43594e-05L11.5465 4.61876L8.87986 5.43594e-05H4.61841L11.5465 11.9997L18.4745 5.43594e-05H14.2131Z" fill="#34495E"/></svg>`;
    	const reactIcon = `<svg width="30" height="30" viewBox="0 0 24 21" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M23.7982 10.2874C23.7982 8.7572 21.882 7.30708 18.9441 6.40782C19.6221 3.41342 19.3208 1.03109 17.9931 0.268366C17.687 0.0894551 17.3292 0.0047081 16.9384 0.0047081V1.05463C17.155 1.05463 17.3292 1.097 17.4752 1.17704C18.1155 1.54428 18.3933 2.94261 18.1767 4.74113C18.1249 5.1837 18.0401 5.64981 17.9366 6.12533C17.0138 5.89934 16.0062 5.72514 14.9469 5.61214C14.3113 4.74113 13.6521 3.95016 12.9883 3.25805C14.5231 1.83148 15.9638 1.04992 16.9431 1.04992V0C15.6484 0 13.9535 0.922802 12.2397 2.52358C10.5259 0.932218 8.83096 0.0188328 7.53622 0.0188328V1.06875C8.51081 1.06875 9.95622 1.8456 11.4911 3.26276C10.8319 3.95486 10.1728 4.74113 9.5466 5.61214C8.48256 5.72514 7.47501 5.89934 6.55221 6.13004C6.44392 5.65922 6.36388 5.20253 6.30738 4.76467C6.0861 2.96615 6.35917 1.56782 6.99478 1.19588C7.13602 1.11113 7.31964 1.07346 7.53622 1.07346V0.0235409C7.14073 0.0235409 6.78291 0.108288 6.47217 0.287198C5.14917 1.04992 4.85256 3.42755 5.53524 6.41253C2.60676 7.3165 0.699951 8.76191 0.699951 10.2874C0.699951 11.8175 2.61618 13.2676 5.55407 14.1669C4.8761 17.1613 5.17742 19.5436 6.50513 20.3063C6.81116 20.4853 7.16898 20.57 7.56446 20.57C8.85921 20.57 10.5542 19.6472 12.2679 18.0464C13.9817 19.6378 15.6766 20.5512 16.9714 20.5512C17.3669 20.5512 17.7247 20.4664 18.0354 20.2875C19.3584 19.5248 19.655 17.1472 18.9724 14.1622C21.8914 13.2629 23.7982 11.8128 23.7982 10.2874ZM17.6682 7.147C17.494 7.75436 17.2774 8.38054 17.0326 9.00673C16.8396 8.63008 16.6371 8.25342 16.4158 7.87677C16.1992 7.50012 15.9686 7.13288 15.7379 6.77506C16.4064 6.87393 17.0514 6.99634 17.6682 7.147ZM15.5119 12.1612C15.1446 12.7968 14.768 13.3995 14.3772 13.9597C13.6757 14.0209 12.9647 14.0539 12.2491 14.0539C11.5382 14.0539 10.8272 14.0209 10.1304 13.9644C9.73964 13.4042 9.35828 12.8062 8.99104 12.1753C8.63322 11.5586 8.30836 10.9324 8.01174 10.3015C8.30365 9.67058 8.63322 9.03969 8.98633 8.42292C9.35357 7.78731 9.73022 7.18467 10.121 6.6244C10.8225 6.56319 11.5335 6.53023 12.2491 6.53023C12.96 6.53023 13.671 6.56319 14.3678 6.61969C14.7585 7.17996 15.1399 7.7779 15.5071 8.40879C15.865 9.02556 16.1898 9.65175 16.4864 10.2826C16.1898 10.9135 15.865 11.5444 15.5119 12.1612ZM17.0326 11.5491C17.2868 12.18 17.5034 12.8109 17.6823 13.423C17.0656 13.5737 16.4158 13.7008 15.7426 13.7996C15.9733 13.4371 16.204 13.0652 16.4205 12.6838C16.6371 12.3072 16.8396 11.9258 17.0326 11.5491ZM12.2585 16.5728C11.8207 16.1208 11.3828 15.617 10.9496 15.0661C11.3734 15.085 11.8065 15.0991 12.2444 15.0991C12.687 15.0991 13.1248 15.0897 13.5533 15.0661C13.1295 15.617 12.6917 16.1208 12.2585 16.5728ZM8.75563 13.7996C8.08707 13.7008 7.44205 13.5784 6.82528 13.4277C6.99948 12.8203 7.21606 12.1942 7.46088 11.568C7.65392 11.9446 7.85637 12.3213 8.07765 12.6979C8.29894 13.0746 8.52493 13.4418 8.75563 13.7996ZM12.235 4.00195C12.6728 4.45393 13.1107 4.9577 13.5438 5.50856C13.1201 5.48973 12.687 5.4756 12.2491 5.4756C11.8065 5.4756 11.3687 5.48502 10.9402 5.50856C11.364 4.9577 11.8018 4.45393 12.235 4.00195ZM8.75092 6.77506C8.52022 7.13759 8.28952 7.50953 8.07295 7.89089C7.85637 8.26755 7.65392 8.6442 7.46088 9.02086C7.20664 8.38996 6.99007 7.75907 6.81116 7.147C7.42793 7.00105 8.07766 6.87393 8.75092 6.77506ZM4.49003 12.6697C2.82334 11.9588 1.74516 11.0265 1.74516 10.2874C1.74516 9.54817 2.82334 8.61124 4.49003 7.90502C4.89493 7.73082 5.3375 7.57545 5.79419 7.42949C6.06256 8.3523 6.41567 9.31276 6.85353 10.2968C6.42038 11.2761 6.07197 12.2318 5.80832 13.1499C5.34221 13.004 4.89964 12.8439 4.49003 12.6697ZM7.02302 19.3977C6.38271 19.0304 6.10493 17.6321 6.32151 15.8336C6.3733 15.391 6.45804 14.9249 6.56162 14.4494C7.48443 14.6754 8.49197 14.8496 9.55131 14.9626C10.1869 15.8336 10.8461 16.6246 11.5099 17.3167C9.97505 18.7432 8.53435 19.5248 7.55505 19.5248C7.34318 19.5201 7.16427 19.4777 7.02302 19.3977ZM18.1908 15.81C18.4121 17.6086 18.139 19.0069 17.5034 19.3788C17.3622 19.4636 17.1785 19.5012 16.962 19.5012C15.9874 19.5012 14.542 18.7244 13.0071 17.3072C13.6663 16.6151 14.3254 15.8289 14.9516 14.9579C16.0156 14.8449 17.0232 14.6707 17.946 14.44C18.0543 14.9155 18.139 15.3722 18.1908 15.81ZM20.0035 12.6697C19.5985 12.8439 19.156 12.9993 18.6993 13.1452C18.4309 12.2224 18.0778 11.2619 17.6399 10.2779C18.0731 9.29864 18.4215 8.34288 18.6852 7.42479C19.1513 7.57074 19.5938 7.73082 20.0082 7.90502C21.6749 8.61595 22.753 9.54817 22.753 10.2874C22.7483 11.0265 21.6701 11.9635 20.0035 12.6697Z" fill="#61DAFB"/><path d="M12.2444 12.439C13.4327 12.439 14.396 11.4757 14.396 10.2874C14.396 9.09906 13.4327 8.13574 12.2444 8.13574C11.0561 8.13574 10.0928 9.09906 10.0928 10.2874C10.0928 11.4757 11.0561 12.439 12.2444 12.439Z" fill="#61DAFB"/></svg>`;

    	const passLockedComponent = () => {
    		componentLocked(vscode);
    	};

    	const passUnlockedComponent = (path, name = "newComponent", type) => {
    		passComponentToEditor(vscode, path, name, type, framework, token);
    	};

    	const previewComponent = url => {
    		vscode.postMessage({ type: "previewModal", url });
    	};

    	const openBrowser = url => {
    		vscode.postMessage({ type: "openBrowser", url });
    	};

    	const writable_props = ['vscode', 'component', 'framework', 'token'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ComponentItem> was created with unknown prop '${key}'`);
    	});

    	const click_handler = e => {
    		e.stopPropagation();
    		openBrowser("https://dashboard.vsblox.com/signup");
    	};

    	const click_handler_1 = event => {
    		event.stopPropagation();
    		previewComponent(`https://cdn.tuk.dev/previews/desktop-2x/${component.name}.jpg`);
    	};

    	const click_handler_2 = () => {
    		passLockedComponent();
    	};

    	const click_handler_3 = event => {
    		event.stopPropagation();
    		passUnlockedComponent(component.path, component.name, "html");
    	};

    	const click_handler_4 = event => {
    		event.stopPropagation();
    		passUnlockedComponent(component.path, component.name, "ts");
    	};

    	const click_handler_5 = event => {
    		event.stopPropagation();
    		let type = "html";

    		if (framework === "react") {
    			type = "js";
    		} else if (framework === "vue") {
    			type = "vue";
    		}

    		passUnlockedComponent(component.path, component.name, type);
    	};

    	const click_handler_6 = () => {
    		if (component.locked) {
    			passLockedComponent();
    		}
    	};

    	$$self.$$set = $$props => {
    		if ('vscode' in $$props) $$invalidate(12, vscode = $$props.vscode);
    		if ('component' in $$props) $$invalidate(0, component = $$props.component);
    		if ('framework' in $$props) $$invalidate(1, framework = $$props.framework);
    		if ('token' in $$props) $$invalidate(13, token = $$props.token);
    	};

    	$$self.$capture_state = () => ({
    		capitalizeFirstLetter,
    		componentLocked,
    		passComponentToEditor,
    		vscode,
    		component,
    		framework,
    		token,
    		zoomIcon,
    		lockIcon,
    		tsIcon,
    		htmlIcon,
    		vueIcon,
    		reactIcon,
    		passLockedComponent,
    		passUnlockedComponent,
    		previewComponent,
    		openBrowser
    	});

    	$$self.$inject_state = $$props => {
    		if ('vscode' in $$props) $$invalidate(12, vscode = $$props.vscode);
    		if ('component' in $$props) $$invalidate(0, component = $$props.component);
    		if ('framework' in $$props) $$invalidate(1, framework = $$props.framework);
    		if ('token' in $$props) $$invalidate(13, token = $$props.token);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		component,
    		framework,
    		zoomIcon,
    		lockIcon,
    		tsIcon,
    		htmlIcon,
    		vueIcon,
    		reactIcon,
    		passLockedComponent,
    		passUnlockedComponent,
    		previewComponent,
    		openBrowser,
    		vscode,
    		token,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		click_handler_5,
    		click_handler_6
    	];
    }

    class ComponentItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {
    			vscode: 12,
    			component: 0,
    			framework: 1,
    			token: 13
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ComponentItem",
    			options,
    			id: create_fragment$8.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*vscode*/ ctx[12] === undefined && !('vscode' in props)) {
    			console.warn("<ComponentItem> was created without expected prop 'vscode'");
    		}

    		if (/*component*/ ctx[0] === undefined && !('component' in props)) {
    			console.warn("<ComponentItem> was created without expected prop 'component'");
    		}

    		if (/*framework*/ ctx[1] === undefined && !('framework' in props)) {
    			console.warn("<ComponentItem> was created without expected prop 'framework'");
    		}
    	}

    	get vscode() {
    		throw new Error("<ComponentItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set vscode(value) {
    		throw new Error("<ComponentItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get component() {
    		throw new Error("<ComponentItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set component(value) {
    		throw new Error("<ComponentItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get framework() {
    		throw new Error("<ComponentItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set framework(value) {
    		throw new Error("<ComponentItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get token() {
    		throw new Error("<ComponentItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set token(value) {
    		throw new Error("<ComponentItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* webviews\components\Sidebar\AllComponents\FilteredComponents\FilteredComponents.svelte generated by Svelte v3.43.1 */
    const file$6 = "webviews\\components\\Sidebar\\AllComponents\\FilteredComponents\\FilteredComponents.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (19:0) {:else}
    function create_else_block_1$1(ctx) {
    	let p;
    	let t0;
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("No conmponent found for: \"");
    			t1 = text(/*search*/ ctx[2]);
    			t2 = text("\"");
    			add_location(p, file$6, 19, 2, 512);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*search*/ 4) set_data_dev(t1, /*search*/ ctx[2]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1$1.name,
    		type: "else",
    		source: "(19:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (11:0) {#if filteredComponents}
    function create_if_block$4(ctx) {
    	let div;
    	let current;
    	let each_value = /*filteredComponents*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	let each_1_else = null;

    	if (!each_value.length) {
    		each_1_else = create_else_block$3(ctx);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			if (each_1_else) {
    				each_1_else.c();
    			}

    			attr_dev(div, "class", "component-section");
    			add_location(div, file$6, 11, 2, 271);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			if (each_1_else) {
    				each_1_else.m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*filteredComponents, framework, vscode, token, search*/ 31) {
    				each_value = /*filteredComponents*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();

    				if (!each_value.length && each_1_else) {
    					each_1_else.p(ctx, dirty);
    				} else if (!each_value.length) {
    					each_1_else = create_else_block$3(ctx);
    					each_1_else.c();
    					each_1_else.m(div, null);
    				} else if (each_1_else) {
    					each_1_else.d(1);
    					each_1_else = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    			if (each_1_else) each_1_else.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(11:0) {#if filteredComponents}",
    		ctx
    	});

    	return block;
    }

    // (15:4) {:else}
    function create_else_block$3(ctx) {
    	let p;
    	let t0;
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("No conmponent found for: \"");
    			t1 = text(/*search*/ ctx[2]);
    			t2 = text("\"");
    			add_location(p, file$6, 15, 6, 434);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(p, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*search*/ 4) set_data_dev(t1, /*search*/ ctx[2]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$3.name,
    		type: "else",
    		source: "(15:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (13:4) {#each filteredComponents as component}
    function create_each_block$1(ctx) {
    	let componentitem;
    	let current;

    	componentitem = new ComponentItem({
    			props: {
    				component: /*component*/ ctx[5],
    				framework: /*framework*/ ctx[3],
    				vscode: /*vscode*/ ctx[0],
    				token: /*token*/ ctx[4]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(componentitem.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(componentitem, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const componentitem_changes = {};
    			if (dirty & /*filteredComponents*/ 2) componentitem_changes.component = /*component*/ ctx[5];
    			if (dirty & /*framework*/ 8) componentitem_changes.framework = /*framework*/ ctx[3];
    			if (dirty & /*vscode*/ 1) componentitem_changes.vscode = /*vscode*/ ctx[0];
    			if (dirty & /*token*/ 16) componentitem_changes.token = /*token*/ ctx[4];
    			componentitem.$set(componentitem_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(componentitem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(componentitem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(componentitem, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(13:4) {#each filteredComponents as component}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$4, create_else_block_1$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*filteredComponents*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('FilteredComponents', slots, []);
    	let { vscode } = $$props;
    	let { filteredComponents = null } = $$props;
    	let { search = "" } = $$props;
    	let { framework = "" } = $$props;
    	let { token = null } = $$props;
    	const writable_props = ['vscode', 'filteredComponents', 'search', 'framework', 'token'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<FilteredComponents> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('vscode' in $$props) $$invalidate(0, vscode = $$props.vscode);
    		if ('filteredComponents' in $$props) $$invalidate(1, filteredComponents = $$props.filteredComponents);
    		if ('search' in $$props) $$invalidate(2, search = $$props.search);
    		if ('framework' in $$props) $$invalidate(3, framework = $$props.framework);
    		if ('token' in $$props) $$invalidate(4, token = $$props.token);
    	};

    	$$self.$capture_state = () => ({
    		ComponentItem,
    		vscode,
    		filteredComponents,
    		search,
    		framework,
    		token
    	});

    	$$self.$inject_state = $$props => {
    		if ('vscode' in $$props) $$invalidate(0, vscode = $$props.vscode);
    		if ('filteredComponents' in $$props) $$invalidate(1, filteredComponents = $$props.filteredComponents);
    		if ('search' in $$props) $$invalidate(2, search = $$props.search);
    		if ('framework' in $$props) $$invalidate(3, framework = $$props.framework);
    		if ('token' in $$props) $$invalidate(4, token = $$props.token);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [vscode, filteredComponents, search, framework, token];
    }

    class FilteredComponents extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {
    			vscode: 0,
    			filteredComponents: 1,
    			search: 2,
    			framework: 3,
    			token: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FilteredComponents",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*vscode*/ ctx[0] === undefined && !('vscode' in props)) {
    			console.warn("<FilteredComponents> was created without expected prop 'vscode'");
    		}
    	}

    	get vscode() {
    		throw new Error("<FilteredComponents>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set vscode(value) {
    		throw new Error("<FilteredComponents>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get filteredComponents() {
    		throw new Error("<FilteredComponents>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set filteredComponents(value) {
    		throw new Error("<FilteredComponents>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get search() {
    		throw new Error("<FilteredComponents>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set search(value) {
    		throw new Error("<FilteredComponents>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get framework() {
    		throw new Error("<FilteredComponents>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set framework(value) {
    		throw new Error("<FilteredComponents>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get token() {
    		throw new Error("<FilteredComponents>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set token(value) {
    		throw new Error("<FilteredComponents>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const selectedCard = writable(null);

    const updateKey = (card) => {
      selectedCard.set(card.split(" ")[0]);
    };

    /* webviews\components\Sidebar\AllComponents\Accordion\Accordion.svelte generated by Svelte v3.43.1 */

    const { Object: Object_1 } = globals;
    const file$5 = "webviews\\components\\Sidebar\\AllComponents\\Accordion\\Accordion.svelte";

    // (50:0) {#if token && showLogout}
    function create_if_block_4(ctx) {
    	let button;
    	let svg;
    	let path0;
    	let path1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			attr_dev(path0, "fill", "none");
    			attr_dev(path0, "d", "M0 0h24v24H0z");
    			add_location(path0, file$5, 56, 7, 5461);
    			attr_dev(path1, "d", "M4 18h2v2h12V4H6v2H4V3a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3zm2-7h7v2H6v3l-5-4 5-4v3z");
    			attr_dev(path1, "fill", "#949A98");
    			add_location(path1, file$5, 56, 45, 5499);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			attr_dev(svg, "width", "22");
    			attr_dev(svg, "height", "22");
    			add_location(svg, file$5, 51, 4, 5342);
    			attr_dev(button, "class", "btn-logout svelte-17kj691");
    			attr_dev(button, "title", "Logout");
    			add_location(button, file$5, 50, 2, 5276);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, svg);
    			append_dev(svg, path0);
    			append_dev(svg, path1);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*logout*/ ctx[12], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(50:0) {#if token && showLogout}",
    		ctx
    	});

    	return block;
    }

    // (70:4) {#if showDropIcon}
    function create_if_block_2$1(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*isActive*/ ctx[2]) return create_if_block_3;
    		return create_else_block$2;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(70:4) {#if showDropIcon}",
    		ctx
    	});

    	return block;
    }

    // (73:6) {:else}
    function create_else_block$2(ctx) {
    	let html_tag;
    	let raw_value = /*icons*/ ctx[10].chevronRight + "";
    	let html_anchor;

    	const block = {
    		c: function create() {
    			html_tag = new HtmlTag();
    			html_anchor = empty();
    			html_tag.a = html_anchor;
    		},
    		m: function mount(target, anchor) {
    			html_tag.m(raw_value, target, anchor);
    			insert_dev(target, html_anchor, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(73:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (71:6) {#if isActive}
    function create_if_block_3(ctx) {
    	let html_tag;
    	let raw_value = /*icons*/ ctx[10].chevronDown + "";
    	let html_anchor;

    	const block = {
    		c: function create() {
    			html_tag = new HtmlTag();
    			html_anchor = empty();
    			html_tag.a = html_anchor;
    		},
    		m: function mount(target, anchor) {
    			html_tag.m(raw_value, target, anchor);
    			insert_dev(target, html_anchor, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(71:6) {#if isActive}",
    		ctx
    	});

    	return block;
    }

    // (81:6) {#if icon && Object.keys(icons).includes(icon)}
    function create_if_block_1$1(ctx) {
    	let div;
    	let span;
    	let html_tag;
    	let raw_value = /*icons*/ ctx[10][/*icon*/ ctx[4]] + "";

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			span.textContent = "Having issues using blox? Send us an email stating your problem or\r\n            just your feedback, and we'll get back to you ASAP.\r\n          ";
    			html_tag = new HtmlTag();
    			attr_dev(span, "class", "svelte-17kj691");
    			add_location(span, file$5, 82, 10, 6265);
    			html_tag.a = null;
    			attr_dev(div, "class", "prefix-icon svelte-17kj691");
    			add_location(div, file$5, 81, 8, 6228);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			html_tag.m(raw_value, div);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*icon*/ 16 && raw_value !== (raw_value = /*icons*/ ctx[10][/*icon*/ ctx[4]] + "")) html_tag.p(raw_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(81:6) {#if icon && Object.keys(icons).includes(icon)}",
    		ctx
    	});

    	return block;
    }

    // (91:4) {#if showCheckoutButton}
    function create_if_block$3(ctx) {
    	let button;
    	let raw_value = /*icons*/ ctx[10].cart + "";
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			attr_dev(button, "class", "add-to-cart svelte-17kj691");
    			add_location(button, file$5, 91, 6, 6552);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			button.innerHTML = raw_value;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[18], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(91:4) {#if showCheckoutButton}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let t0;
    	let div2;
    	let div0;
    	let t1;
    	let h2;
    	let show_if = /*icon*/ ctx[4] && Object.keys(/*icons*/ ctx[10]).includes(/*icon*/ ctx[4]);
    	let t2;
    	let t3;
    	let h2_class_value;
    	let t4;
    	let div0_class_value;
    	let t5;
    	let div1;
    	let div1_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*token*/ ctx[0] && /*showLogout*/ ctx[8] && create_if_block_4(ctx);
    	let if_block1 = /*showDropIcon*/ ctx[5] && create_if_block_2$1(ctx);
    	let if_block2 = show_if && create_if_block_1$1(ctx);
    	let if_block3 = /*showCheckoutButton*/ ctx[7] && create_if_block$3(ctx);
    	const default_slot_template = /*#slots*/ ctx[17].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[16], null);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			div2 = element("div");
    			div0 = element("div");
    			if (if_block1) if_block1.c();
    			t1 = space();
    			h2 = element("h2");
    			if (if_block2) if_block2.c();
    			t2 = space();
    			t3 = text(/*headerText*/ ctx[1]);
    			t4 = space();
    			if (if_block3) if_block3.c();
    			t5 = space();
    			div1 = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(h2, "class", h2_class_value = "" + (null_to_empty(`header-text ${/*showDropIcon*/ ctx[5] ? "ml1" : ""}`) + " svelte-17kj691"));
    			set_style(h2, "font-weight", !/*isActive*/ ctx[2] ? /*fontWeight*/ ctx[3] : '700');
    			add_location(h2, file$5, 76, 4, 6035);
    			attr_dev(div0, "class", div0_class_value = "" + (null_to_empty(`accordion-header ${/*isActive*/ ctx[2] ? "accordion-header--active" : ""}`) + " svelte-17kj691"));
    			add_location(div0, file$5, 64, 2, 5727);

    			attr_dev(div1, "class", div1_class_value = "" + (null_to_empty(`accordion-content ${/*isActive*/ ctx[2] ? "accordion-content--active" : ""} ${/*showActiveBorder*/ ctx[6]
			? "accordion-content--active-border"
			: ""}`) + " svelte-17kj691"));

    			add_location(div1, file$5, 97, 2, 6694);
    			attr_dev(div2, "class", "accordion svelte-17kj691");
    			add_location(div2, file$5, 63, 0, 5700);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			if (if_block1) if_block1.m(div0, null);
    			append_dev(div0, t1);
    			append_dev(div0, h2);
    			if (if_block2) if_block2.m(h2, null);
    			append_dev(h2, t2);
    			append_dev(h2, t3);
    			append_dev(div0, t4);
    			if (if_block3) if_block3.m(div0, null);
    			/*div0_binding*/ ctx[19](div0);
    			append_dev(div2, t5);
    			append_dev(div2, div1);

    			if (default_slot) {
    				default_slot.m(div1, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div0, "click", /*toggleAccordion*/ ctx[11], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*token*/ ctx[0] && /*showLogout*/ ctx[8]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4(ctx);
    					if_block0.c();
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*showDropIcon*/ ctx[5]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_2$1(ctx);
    					if_block1.c();
    					if_block1.m(div0, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*icon*/ 16) show_if = /*icon*/ ctx[4] && Object.keys(/*icons*/ ctx[10]).includes(/*icon*/ ctx[4]);

    			if (show_if) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_1$1(ctx);
    					if_block2.c();
    					if_block2.m(h2, t2);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (!current || dirty & /*headerText*/ 2) set_data_dev(t3, /*headerText*/ ctx[1]);

    			if (!current || dirty & /*showDropIcon*/ 32 && h2_class_value !== (h2_class_value = "" + (null_to_empty(`header-text ${/*showDropIcon*/ ctx[5] ? "ml1" : ""}`) + " svelte-17kj691"))) {
    				attr_dev(h2, "class", h2_class_value);
    			}

    			if (!current || dirty & /*isActive, fontWeight*/ 12) {
    				set_style(h2, "font-weight", !/*isActive*/ ctx[2] ? /*fontWeight*/ ctx[3] : '700');
    			}

    			if (/*showCheckoutButton*/ ctx[7]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block$3(ctx);
    					if_block3.c();
    					if_block3.m(div0, null);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (!current || dirty & /*isActive*/ 4 && div0_class_value !== (div0_class_value = "" + (null_to_empty(`accordion-header ${/*isActive*/ ctx[2] ? "accordion-header--active" : ""}`) + " svelte-17kj691"))) {
    				attr_dev(div0, "class", div0_class_value);
    			}

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 65536)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[16],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[16])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[16], dirty, null),
    						null
    					);
    				}
    			}

    			if (!current || dirty & /*isActive, showActiveBorder*/ 68 && div1_class_value !== (div1_class_value = "" + (null_to_empty(`accordion-content ${/*isActive*/ ctx[2] ? "accordion-content--active" : ""} ${/*showActiveBorder*/ ctx[6]
			? "accordion-content--active-border"
			: ""}`) + " svelte-17kj691"))) {
    				attr_dev(div1, "class", div1_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div2);
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			/*div0_binding*/ ctx[19](null);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Accordion', slots, ['default']);
    	let { vscode = null } = $$props;
    	let { headerText = "N/A" } = $$props;
    	let { isActive = false } = $$props;
    	let { fontWeight = "400" } = $$props;
    	let { icon = null } = $$props;
    	let { showDropIcon = true } = $$props;
    	let { showActiveBorder = false } = $$props;
    	let { showCheckoutButton = false } = $$props;
    	let { showLogout = false } = $$props;
    	let { token = null } = $$props;
    	let { userDetails = [] } = $$props;
    	let accordion;
    	const dispatch = createEventDispatcher();

    	const icons = {
    		helpIcon: `<svg class="icon" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><style> .icon{margin-right: 7px;} </style><path d="M9 0C4.03125 0 0 4.03125 0 9C0 13.9688 4.03125 18 9 18C13.9688 18 18 13.9688 18 9C18 4.03125 13.9688 0 9 0ZM8.71875 14.25C8.53333 14.25 8.35207 14.195 8.1979 14.092C8.04373 13.989 7.92357 13.8426 7.85261 13.6713C7.78166 13.5 7.76309 13.3115 7.79926 13.1296C7.83544 12.9477 7.92473 12.7807 8.05584 12.6496C8.18695 12.5185 8.354 12.4292 8.53585 12.393C8.71771 12.3568 8.90621 12.3754 9.07752 12.4464C9.24882 12.5173 9.39524 12.6375 9.49825 12.7917C9.60127 12.9458 9.65625 13.1271 9.65625 13.3125C9.65625 13.5611 9.55748 13.7996 9.38166 13.9754C9.20585 14.1512 8.96739 14.25 8.71875 14.25V14.25ZM10.2863 9.46875C9.52641 9.97875 9.42188 10.4461 9.42188 10.875C9.42188 11.049 9.35274 11.216 9.22966 11.339C9.10659 11.4621 8.93967 11.5312 8.76562 11.5312C8.59158 11.5312 8.42466 11.4621 8.30159 11.339C8.17852 11.216 8.10938 11.049 8.10938 10.875C8.10938 9.84797 8.58188 9.03141 9.55406 8.37844C10.4578 7.77188 10.9688 7.3875 10.9688 6.54234C10.9688 5.96766 10.6406 5.53125 9.96141 5.20828C9.80156 5.13234 9.44578 5.05828 9.00797 5.06344C8.45859 5.07047 8.03203 5.20172 7.70344 5.46609C7.08375 5.96484 7.03125 6.50766 7.03125 6.51562C7.02709 6.6018 7.00601 6.68632 6.96919 6.76435C6.93237 6.84238 6.88054 6.9124 6.81667 6.9704C6.75279 7.0284 6.67811 7.07325 6.5969 7.10239C6.51569 7.13153 6.42954 7.14439 6.34336 7.14023C6.25718 7.13608 6.17266 7.11499 6.09463 7.07817C6.0166 7.04135 5.94659 6.98953 5.88859 6.92565C5.83059 6.86177 5.78574 6.7871 5.7566 6.70589C5.72745 6.62468 5.71459 6.53852 5.71875 6.45234C5.72391 6.33844 5.80313 5.31234 6.87984 4.44609C7.43813 3.99703 8.14828 3.76359 8.98922 3.75328C9.58453 3.74625 10.1437 3.84703 10.523 4.02609C11.6578 4.56281 12.2812 5.45766 12.2812 6.54234C12.2812 8.12813 11.2214 8.84016 10.2863 9.46875Z" fill="#9CA2A0"/></svg>`,
    		chevronUp: `<svg xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512"><style>.ionicon{width:15px; pointer-events:none;}</style><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M112 328l144-144 144 144"/></svg>`,
    		chevronDown: `<svg xmlns="http://www.w3.org/2000/svg" class="ionicon" viewBox="0 0 512 512"><style>.ionicon{width:15px; pointer-events:none;}</style><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M112 184l144 144 144-144"/></svg>`,
    		chevronRight: `<svg xmlns="http://www.w3.org/2000/svg" class="ionicon" width="28" height="28" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><style>.ionicon{width:15px; pointer-events:none;}</style><path stroke="none" d="M0 0h24v24H0z" fill="none"/><polyline points="9 6 15 12 9 18" /></svg>`,
    		chevronLeft: `<svg xmlns="http://www.w3.org/2000/svg" class="ionicon" width="28" height="28" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><style>.ionicon{width:15px; pointer-events:none;}</style><path stroke="none" d="M0 0h24v24H0z" fill="none"/><polyline points="15 6 9 12 15 18" /></svg>`,
    		cart: `<svg width="16" height="18" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.99998 16.5C3.92045 16.5 4.66665 15.7538 4.66665 14.8333C4.66665 13.9128 3.92045 13.1667 2.99998 13.1667C2.07951 13.1667 1.33331 13.9128 1.33331 14.8333C1.33331 15.7538 2.07951 16.5 2.99998 16.5Z" stroke="#949A98" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.1667 16.5C13.0871 16.5 13.8333 15.7538 13.8333 14.8333C13.8333 13.9128 13.0871 13.1667 12.1667 13.1667C11.2462 13.1667 10.5 13.9128 10.5 14.8333C10.5 15.7538 11.2462 16.5 12.1667 16.5Z" stroke="#949A98" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.1666 13.1667H2.99998V1.5H1.33331" stroke="#949A98" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 3.16666L14.6667 3.99999L13.8333 9.83332H3" stroke="#949A98" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    	};

    	const toggleAccordion = () => {
    		dispatch("toggleAccordion", { accordion });
    	};

    	const logout = () => {
    		$$invalidate(0, token = null);
    		$$invalidate(14, userDetails = []);
    		vscode.postMessage({ type: "logout" });
    	};

    	const checkout = (event, card) => {
    		event.stopPropagation();

    		vscode.postMessage({
    			type: "goPro",
    			selectedCard: card.split(" ")[0]
    		});
    	};

    	const writable_props = [
    		'vscode',
    		'headerText',
    		'isActive',
    		'fontWeight',
    		'icon',
    		'showDropIcon',
    		'showActiveBorder',
    		'showCheckoutButton',
    		'showLogout',
    		'token',
    		'userDetails'
    	];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Accordion> was created with unknown prop '${key}'`);
    	});

    	const click_handler = e => checkout(e, headerText);

    	function div0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			accordion = $$value;
    			$$invalidate(9, accordion);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('vscode' in $$props) $$invalidate(15, vscode = $$props.vscode);
    		if ('headerText' in $$props) $$invalidate(1, headerText = $$props.headerText);
    		if ('isActive' in $$props) $$invalidate(2, isActive = $$props.isActive);
    		if ('fontWeight' in $$props) $$invalidate(3, fontWeight = $$props.fontWeight);
    		if ('icon' in $$props) $$invalidate(4, icon = $$props.icon);
    		if ('showDropIcon' in $$props) $$invalidate(5, showDropIcon = $$props.showDropIcon);
    		if ('showActiveBorder' in $$props) $$invalidate(6, showActiveBorder = $$props.showActiveBorder);
    		if ('showCheckoutButton' in $$props) $$invalidate(7, showCheckoutButton = $$props.showCheckoutButton);
    		if ('showLogout' in $$props) $$invalidate(8, showLogout = $$props.showLogout);
    		if ('token' in $$props) $$invalidate(0, token = $$props.token);
    		if ('userDetails' in $$props) $$invalidate(14, userDetails = $$props.userDetails);
    		if ('$$scope' in $$props) $$invalidate(16, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		selectedCard,
    		updateKey,
    		vscode,
    		headerText,
    		isActive,
    		fontWeight,
    		icon,
    		showDropIcon,
    		showActiveBorder,
    		showCheckoutButton,
    		showLogout,
    		token,
    		userDetails,
    		accordion,
    		dispatch,
    		icons,
    		toggleAccordion,
    		logout,
    		checkout
    	});

    	$$self.$inject_state = $$props => {
    		if ('vscode' in $$props) $$invalidate(15, vscode = $$props.vscode);
    		if ('headerText' in $$props) $$invalidate(1, headerText = $$props.headerText);
    		if ('isActive' in $$props) $$invalidate(2, isActive = $$props.isActive);
    		if ('fontWeight' in $$props) $$invalidate(3, fontWeight = $$props.fontWeight);
    		if ('icon' in $$props) $$invalidate(4, icon = $$props.icon);
    		if ('showDropIcon' in $$props) $$invalidate(5, showDropIcon = $$props.showDropIcon);
    		if ('showActiveBorder' in $$props) $$invalidate(6, showActiveBorder = $$props.showActiveBorder);
    		if ('showCheckoutButton' in $$props) $$invalidate(7, showCheckoutButton = $$props.showCheckoutButton);
    		if ('showLogout' in $$props) $$invalidate(8, showLogout = $$props.showLogout);
    		if ('token' in $$props) $$invalidate(0, token = $$props.token);
    		if ('userDetails' in $$props) $$invalidate(14, userDetails = $$props.userDetails);
    		if ('accordion' in $$props) $$invalidate(9, accordion = $$props.accordion);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		token,
    		headerText,
    		isActive,
    		fontWeight,
    		icon,
    		showDropIcon,
    		showActiveBorder,
    		showCheckoutButton,
    		showLogout,
    		accordion,
    		icons,
    		toggleAccordion,
    		logout,
    		checkout,
    		userDetails,
    		vscode,
    		$$scope,
    		slots,
    		click_handler,
    		div0_binding
    	];
    }

    class Accordion extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {
    			vscode: 15,
    			headerText: 1,
    			isActive: 2,
    			fontWeight: 3,
    			icon: 4,
    			showDropIcon: 5,
    			showActiveBorder: 6,
    			showCheckoutButton: 7,
    			showLogout: 8,
    			token: 0,
    			userDetails: 14
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Accordion",
    			options,
    			id: create_fragment$6.name
    		});
    	}

    	get vscode() {
    		throw new Error("<Accordion>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set vscode(value) {
    		throw new Error("<Accordion>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get headerText() {
    		throw new Error("<Accordion>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set headerText(value) {
    		throw new Error("<Accordion>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get isActive() {
    		throw new Error("<Accordion>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isActive(value) {
    		throw new Error("<Accordion>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get fontWeight() {
    		throw new Error("<Accordion>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fontWeight(value) {
    		throw new Error("<Accordion>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get icon() {
    		throw new Error("<Accordion>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set icon(value) {
    		throw new Error("<Accordion>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get showDropIcon() {
    		throw new Error("<Accordion>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set showDropIcon(value) {
    		throw new Error("<Accordion>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get showActiveBorder() {
    		throw new Error("<Accordion>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set showActiveBorder(value) {
    		throw new Error("<Accordion>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get showCheckoutButton() {
    		throw new Error("<Accordion>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set showCheckoutButton(value) {
    		throw new Error("<Accordion>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get showLogout() {
    		throw new Error("<Accordion>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set showLogout(value) {
    		throw new Error("<Accordion>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get token() {
    		throw new Error("<Accordion>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set token(value) {
    		throw new Error("<Accordion>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get userDetails() {
    		throw new Error("<Accordion>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set userDetails(value) {
    		throw new Error("<Accordion>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* webviews\components\Sidebar\AllComponents\HelpAndFeedback\HelpAndFeedback.svelte generated by Svelte v3.43.1 */

    const { Error: Error_1$1 } = globals;
    const file$4 = "webviews\\components\\Sidebar\\AllComponents\\HelpAndFeedback\\HelpAndFeedback.svelte";

    // (48:2) <Accordion      isActive={moreInfoIsActive}      headerText="Help and feedback"      fontWeight="500"      icon="helpIcon"      showDropIcon={false}      showLogout      bind:token      bind:userDetails      {vscode}      on:toggleAccordion={() => {        moreInfoIsActive = !moreInfoIsActive;      }}    >
    function create_default_slot$1(ctx) {
    	let form;
    	let input0;
    	let t0;
    	let input1;
    	let t1;
    	let textarea;
    	let t2;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			form = element("form");
    			input0 = element("input");
    			t0 = space();
    			input1 = element("input");
    			t1 = space();
    			textarea = element("textarea");
    			t2 = space();
    			button = element("button");
    			button.textContent = "Submit";
    			attr_dev(input0, "type", "email");
    			attr_dev(input0, "placeholder", "Email");
    			input0.required = true;
    			add_location(input0, file$4, 62, 6, 1620);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "placeholder", "Subject");
    			input1.required = true;
    			add_location(input1, file$4, 63, 6, 1698);
    			attr_dev(textarea, "type", "text");
    			attr_dev(textarea, "placeholder", "Message");
    			textarea.required = true;
    			add_location(textarea, file$4, 64, 6, 1779);
    			attr_dev(button, "type", "submit");
    			add_location(button, file$4, 70, 6, 1906);
    			add_location(form, file$4, 61, 4, 1562);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);
    			append_dev(form, input0);
    			set_input_value(input0, /*email*/ ctx[4]);
    			append_dev(form, t0);
    			append_dev(form, input1);
    			set_input_value(input1, /*subject*/ ctx[5]);
    			append_dev(form, t1);
    			append_dev(form, textarea);
    			set_input_value(textarea, /*message*/ ctx[6]);
    			append_dev(form, t2);
    			append_dev(form, button);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[8]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[9]),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[10]),
    					listen_dev(form, "submit", /*submit_handler*/ ctx[11], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*email*/ 16 && input0.value !== /*email*/ ctx[4]) {
    				set_input_value(input0, /*email*/ ctx[4]);
    			}

    			if (dirty & /*subject*/ 32 && input1.value !== /*subject*/ ctx[5]) {
    				set_input_value(input1, /*subject*/ ctx[5]);
    			}

    			if (dirty & /*message*/ 64) {
    				set_input_value(textarea, /*message*/ ctx[6]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(48:2) <Accordion      isActive={moreInfoIsActive}      headerText=\\\"Help and feedback\\\"      fontWeight=\\\"500\\\"      icon=\\\"helpIcon\\\"      showDropIcon={false}      showLogout      bind:token      bind:userDetails      {vscode}      on:toggleAccordion={() => {        moreInfoIsActive = !moreInfoIsActive;      }}    >",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div;
    	let accordion;
    	let updating_token;
    	let updating_userDetails;
    	let current;

    	function accordion_token_binding(value) {
    		/*accordion_token_binding*/ ctx[12](value);
    	}

    	function accordion_userDetails_binding(value) {
    		/*accordion_userDetails_binding*/ ctx[13](value);
    	}

    	let accordion_props = {
    		isActive: /*moreInfoIsActive*/ ctx[3],
    		headerText: "Help and feedback",
    		fontWeight: "500",
    		icon: "helpIcon",
    		showDropIcon: false,
    		showLogout: true,
    		vscode: /*vscode*/ ctx[2],
    		$$slots: { default: [create_default_slot$1] },
    		$$scope: { ctx }
    	};

    	if (/*token*/ ctx[0] !== void 0) {
    		accordion_props.token = /*token*/ ctx[0];
    	}

    	if (/*userDetails*/ ctx[1] !== void 0) {
    		accordion_props.userDetails = /*userDetails*/ ctx[1];
    	}

    	accordion = new Accordion({ props: accordion_props, $$inline: true });
    	binding_callbacks.push(() => bind(accordion, 'token', accordion_token_binding));
    	binding_callbacks.push(() => bind(accordion, 'userDetails', accordion_userDetails_binding));
    	accordion.$on("toggleAccordion", /*toggleAccordion_handler*/ ctx[14]);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(accordion.$$.fragment);
    			attr_dev(div, "class", "more-info-container svelte-14ucb17");
    			add_location(div, file$4, 46, 0, 1212);
    		},
    		l: function claim(nodes) {
    			throw new Error_1$1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(accordion, div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const accordion_changes = {};
    			if (dirty & /*moreInfoIsActive*/ 8) accordion_changes.isActive = /*moreInfoIsActive*/ ctx[3];
    			if (dirty & /*vscode*/ 4) accordion_changes.vscode = /*vscode*/ ctx[2];

    			if (dirty & /*$$scope, message, subject, email*/ 32880) {
    				accordion_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_token && dirty & /*token*/ 1) {
    				updating_token = true;
    				accordion_changes.token = /*token*/ ctx[0];
    				add_flush_callback(() => updating_token = false);
    			}

    			if (!updating_userDetails && dirty & /*userDetails*/ 2) {
    				updating_userDetails = true;
    				accordion_changes.userDetails = /*userDetails*/ ctx[1];
    				add_flush_callback(() => updating_userDetails = false);
    			}

    			accordion.$set(accordion_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(accordion.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(accordion.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(accordion);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('HelpAndFeedback', slots, []);
    	let { vscode } = $$props;
    	let { token } = $$props;
    	let { userDetails } = $$props;
    	let moreInfoIsActive = false;
    	let email = "";
    	let subject = "";
    	let message = "";

    	const submitMessage = event => {
    		event.preventDefault();

    		fetch("https://7jn82juu23.execute-api.us-west-1.amazonaws.com/dev/support/email", {
    			method: "POST",
    			header: new Headers({
    					key: "Content-Type",
    					value: "application/json"
    				}),
    			body: JSON.stringify({ email, subject, message })
    		}).then(response => response.json()).then(response => {
    			if (response.success) {
    				vscode.postMessage({
    					type: "onMessage",
    					message: "Thanks for reaching out to us. We will get back to you soon."
    				});

    				return;
    			}

    			throw new Error("Something went wrong! Please try again later");
    		}).catch(error => {
    			vscode.postMessage({
    				type: "onError",
    				message: error.message || JSON.stringify(error)
    			});
    		});
    	};

    	const writable_props = ['vscode', 'token', 'userDetails'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<HelpAndFeedback> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		email = this.value;
    		$$invalidate(4, email);
    	}

    	function input1_input_handler() {
    		subject = this.value;
    		$$invalidate(5, subject);
    	}

    	function textarea_input_handler() {
    		message = this.value;
    		$$invalidate(6, message);
    	}

    	const submit_handler = event => submitMessage(event);

    	function accordion_token_binding(value) {
    		token = value;
    		$$invalidate(0, token);
    	}

    	function accordion_userDetails_binding(value) {
    		userDetails = value;
    		$$invalidate(1, userDetails);
    	}

    	const toggleAccordion_handler = () => {
    		$$invalidate(3, moreInfoIsActive = !moreInfoIsActive);
    	};

    	$$self.$$set = $$props => {
    		if ('vscode' in $$props) $$invalidate(2, vscode = $$props.vscode);
    		if ('token' in $$props) $$invalidate(0, token = $$props.token);
    		if ('userDetails' in $$props) $$invalidate(1, userDetails = $$props.userDetails);
    	};

    	$$self.$capture_state = () => ({
    		Accordion,
    		vscode,
    		token,
    		userDetails,
    		moreInfoIsActive,
    		email,
    		subject,
    		message,
    		submitMessage
    	});

    	$$self.$inject_state = $$props => {
    		if ('vscode' in $$props) $$invalidate(2, vscode = $$props.vscode);
    		if ('token' in $$props) $$invalidate(0, token = $$props.token);
    		if ('userDetails' in $$props) $$invalidate(1, userDetails = $$props.userDetails);
    		if ('moreInfoIsActive' in $$props) $$invalidate(3, moreInfoIsActive = $$props.moreInfoIsActive);
    		if ('email' in $$props) $$invalidate(4, email = $$props.email);
    		if ('subject' in $$props) $$invalidate(5, subject = $$props.subject);
    		if ('message' in $$props) $$invalidate(6, message = $$props.message);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		token,
    		userDetails,
    		vscode,
    		moreInfoIsActive,
    		email,
    		subject,
    		message,
    		submitMessage,
    		input0_input_handler,
    		input1_input_handler,
    		textarea_input_handler,
    		submit_handler,
    		accordion_token_binding,
    		accordion_userDetails_binding,
    		toggleAccordion_handler
    	];
    }

    class HelpAndFeedback extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { vscode: 2, token: 0, userDetails: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "HelpAndFeedback",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*vscode*/ ctx[2] === undefined && !('vscode' in props)) {
    			console.warn("<HelpAndFeedback> was created without expected prop 'vscode'");
    		}

    		if (/*token*/ ctx[0] === undefined && !('token' in props)) {
    			console.warn("<HelpAndFeedback> was created without expected prop 'token'");
    		}

    		if (/*userDetails*/ ctx[1] === undefined && !('userDetails' in props)) {
    			console.warn("<HelpAndFeedback> was created without expected prop 'userDetails'");
    		}
    	}

    	get vscode() {
    		throw new Error_1$1("<HelpAndFeedback>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set vscode(value) {
    		throw new Error_1$1("<HelpAndFeedback>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get token() {
    		throw new Error_1$1("<HelpAndFeedback>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set token(value) {
    		throw new Error_1$1("<HelpAndFeedback>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get userDetails() {
    		throw new Error_1$1("<HelpAndFeedback>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set userDetails(value) {
    		throw new Error_1$1("<HelpAndFeedback>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* webviews\components\Sidebar\AllComponents\SearchInputFiled\SearchInputFiled.svelte generated by Svelte v3.43.1 */
    const file$3 = "webviews\\components\\Sidebar\\AllComponents\\SearchInputFiled\\SearchInputFiled.svelte";

    // (25:2) {#if search.length > 0}
    function create_if_block$2(ctx) {
    	let span;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "✕";
    			attr_dev(span, "class", "close-icon svelte-brg8rk");
    			add_location(span, file$3, 25, 4, 556);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);

    			if (!mounted) {
    				dispose = listen_dev(span, "click", /*click_handler*/ ctx[5], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(25:2) {#if search.length > 0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div;
    	let input;
    	let t;
    	let mounted;
    	let dispose;
    	let if_block = /*search*/ ctx[0].length > 0 && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			input = element("input");
    			t = space();
    			if (if_block) if_block.c();
    			attr_dev(input, "type", "text");
    			input.disabled = /*searchIsDisabled*/ ctx[1];
    			attr_dev(input, "placeholder", "Search");
    			attr_dev(input, "class", "svelte-brg8rk");
    			add_location(input, file$3, 17, 2, 370);
    			attr_dev(div, "class", "search-input svelte-brg8rk");
    			add_location(div, file$3, 16, 0, 340);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input);
    			/*input_binding*/ ctx[4](input);
    			append_dev(div, t);
    			if (if_block) if_block.m(div, null);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*filterComponents*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*searchIsDisabled*/ 2) {
    				prop_dev(input, "disabled", /*searchIsDisabled*/ ctx[1]);
    			}

    			if (/*search*/ ctx[0].length > 0) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*input_binding*/ ctx[4](null);
    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('SearchInputFiled', slots, []);
    	const dispatch = createEventDispatcher();
    	let { search = "" } = $$props;
    	let { searchIsDisabled = true } = $$props;
    	let searchInputRef;

    	const filterComponents = event => {
    		dispatch("filterComponents", { value: event.target.value });
    	};

    	const writable_props = ['search', 'searchIsDisabled'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<SearchInputFiled> was created with unknown prop '${key}'`);
    	});

    	function input_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			searchInputRef = $$value;
    			$$invalidate(2, searchInputRef);
    		});
    	}

    	const click_handler = () => {
    		$$invalidate(0, search = "");
    		$$invalidate(2, searchInputRef.value = "", searchInputRef);
    	};

    	$$self.$$set = $$props => {
    		if ('search' in $$props) $$invalidate(0, search = $$props.search);
    		if ('searchIsDisabled' in $$props) $$invalidate(1, searchIsDisabled = $$props.searchIsDisabled);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		search,
    		searchIsDisabled,
    		searchInputRef,
    		filterComponents
    	});

    	$$self.$inject_state = $$props => {
    		if ('search' in $$props) $$invalidate(0, search = $$props.search);
    		if ('searchIsDisabled' in $$props) $$invalidate(1, searchIsDisabled = $$props.searchIsDisabled);
    		if ('searchInputRef' in $$props) $$invalidate(2, searchInputRef = $$props.searchInputRef);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		search,
    		searchIsDisabled,
    		searchInputRef,
    		filterComponents,
    		input_binding,
    		click_handler
    	];
    }

    class SearchInputFiled extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { search: 0, searchIsDisabled: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SearchInputFiled",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get search() {
    		throw new Error("<SearchInputFiled>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set search(value) {
    		throw new Error("<SearchInputFiled>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get searchIsDisabled() {
    		throw new Error("<SearchInputFiled>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set searchIsDisabled(value) {
    		throw new Error("<SearchInputFiled>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* webviews\components\UI\Skeleton.svelte generated by Svelte v3.43.1 */

    const file$2 = "webviews\\components\\UI\\Skeleton.svelte";

    function create_fragment$3(ctx) {
    	let div1;
    	let div0;
    	let span0;
    	let t0;
    	let div3;
    	let div2;
    	let span1;
    	let t1;
    	let div5;
    	let div4;
    	let span2;
    	let t2;
    	let div8;
    	let div6;
    	let span3;
    	let t3;
    	let div7;
    	let span4;
    	let t4;
    	let div11;
    	let div9;
    	let span5;
    	let t5;
    	let div10;
    	let span6;
    	let t6;
    	let div14;
    	let div12;
    	let span7;
    	let t7;
    	let div13;
    	let span8;
    	let t8;
    	let div17;
    	let div15;
    	let span9;
    	let t9;
    	let div16;
    	let span10;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			span0 = element("span");
    			t0 = space();
    			div3 = element("div");
    			div2 = element("div");
    			span1 = element("span");
    			t1 = space();
    			div5 = element("div");
    			div4 = element("div");
    			span2 = element("span");
    			t2 = space();
    			div8 = element("div");
    			div6 = element("div");
    			span3 = element("span");
    			t3 = space();
    			div7 = element("div");
    			span4 = element("span");
    			t4 = space();
    			div11 = element("div");
    			div9 = element("div");
    			span5 = element("span");
    			t5 = space();
    			div10 = element("div");
    			span6 = element("span");
    			t6 = space();
    			div14 = element("div");
    			div12 = element("div");
    			span7 = element("span");
    			t7 = space();
    			div13 = element("div");
    			span8 = element("span");
    			t8 = space();
    			div17 = element("div");
    			div15 = element("div");
    			span9 = element("span");
    			t9 = space();
    			div16 = element("div");
    			span10 = element("span");
    			attr_dev(span0, "class", "skeleton-loader svelte-19egoia");
    			add_location(span0, file$2, 2, 4, 72);
    			attr_dev(div0, "class", "custom-dropdown svelte-19egoia");
    			add_location(div0, file$2, 1, 2, 37);
    			attr_dev(div1, "class", "skeleton-container  svelte-19egoia");
    			add_location(div1, file$2, 0, 0, 0);
    			attr_dev(span1, "class", "skeleton-loader svelte-19egoia");
    			add_location(span1, file$2, 7, 4, 192);
    			attr_dev(div2, "class", "search-input svelte-19egoia");
    			add_location(div2, file$2, 6, 2, 160);
    			attr_dev(div3, "class", "skeleton-container svelte-19egoia");
    			add_location(div3, file$2, 5, 0, 124);
    			attr_dev(span2, "class", "skeleton-loader svelte-19egoia");
    			add_location(span2, file$2, 12, 4, 312);
    			attr_dev(div4, "class", "search-input svelte-19egoia");
    			add_location(div4, file$2, 11, 2, 280);
    			attr_dev(div5, "class", "skeleton-container svelte-19egoia");
    			add_location(div5, file$2, 10, 0, 244);
    			attr_dev(span3, "class", "skeleton-loader svelte-19egoia");
    			add_location(span3, file$2, 17, 4, 437);
    			attr_dev(div6, "class", "content svelte-19egoia");
    			add_location(div6, file$2, 16, 2, 410);
    			attr_dev(span4, "class", "skeleton-loader svelte-19egoia");
    			add_location(span4, file$2, 20, 4, 509);
    			attr_dev(div7, "class", "circle svelte-19egoia");
    			add_location(div7, file$2, 19, 2, 483);
    			attr_dev(div8, "class", "skeleton-container accordion svelte-19egoia");
    			add_location(div8, file$2, 15, 0, 364);
    			attr_dev(span5, "class", "skeleton-loader svelte-19egoia");
    			add_location(span5, file$2, 25, 4, 634);
    			attr_dev(div9, "class", "content svelte-19egoia");
    			add_location(div9, file$2, 24, 2, 607);
    			attr_dev(span6, "class", "skeleton-loader svelte-19egoia");
    			add_location(span6, file$2, 28, 4, 706);
    			attr_dev(div10, "class", "circle svelte-19egoia");
    			add_location(div10, file$2, 27, 2, 680);
    			attr_dev(div11, "class", "skeleton-container accordion svelte-19egoia");
    			add_location(div11, file$2, 23, 0, 561);
    			attr_dev(span7, "class", "skeleton-loader svelte-19egoia");
    			add_location(span7, file$2, 33, 4, 831);
    			attr_dev(div12, "class", "content svelte-19egoia");
    			add_location(div12, file$2, 32, 2, 804);
    			attr_dev(span8, "class", "skeleton-loader svelte-19egoia");
    			add_location(span8, file$2, 36, 4, 903);
    			attr_dev(div13, "class", "circle svelte-19egoia");
    			add_location(div13, file$2, 35, 2, 877);
    			attr_dev(div14, "class", "skeleton-container accordion svelte-19egoia");
    			add_location(div14, file$2, 31, 0, 758);
    			attr_dev(span9, "class", "skeleton-loader svelte-19egoia");
    			add_location(span9, file$2, 41, 4, 1028);
    			attr_dev(div15, "class", "content svelte-19egoia");
    			add_location(div15, file$2, 40, 2, 1001);
    			attr_dev(span10, "class", "skeleton-loader svelte-19egoia");
    			add_location(span10, file$2, 44, 4, 1100);
    			attr_dev(div16, "class", "circle svelte-19egoia");
    			add_location(div16, file$2, 43, 2, 1074);
    			attr_dev(div17, "class", "skeleton-container accordion svelte-19egoia");
    			add_location(div17, file$2, 39, 0, 955);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, span0);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, span1);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div4);
    			append_dev(div4, span2);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div8, anchor);
    			append_dev(div8, div6);
    			append_dev(div6, span3);
    			append_dev(div8, t3);
    			append_dev(div8, div7);
    			append_dev(div7, span4);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, div11, anchor);
    			append_dev(div11, div9);
    			append_dev(div9, span5);
    			append_dev(div11, t5);
    			append_dev(div11, div10);
    			append_dev(div10, span6);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, div14, anchor);
    			append_dev(div14, div12);
    			append_dev(div12, span7);
    			append_dev(div14, t7);
    			append_dev(div14, div13);
    			append_dev(div13, span8);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, div17, anchor);
    			append_dev(div17, div15);
    			append_dev(div15, span9);
    			append_dev(div17, t9);
    			append_dev(div17, div16);
    			append_dev(div16, span10);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div3);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div5);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div8);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(div11);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(div14);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(div17);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Skeleton', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Skeleton> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Skeleton extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Skeleton",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* webviews\components\Sidebar\AllComponents\Tabs\Tabs.svelte generated by Svelte v3.43.1 */
    const file$1 = "webviews\\components\\Sidebar\\AllComponents\\Tabs\\Tabs.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	child_ctx[15] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	child_ctx[18] = i;
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[22] = list[i];
    	child_ctx[24] = i;
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	return child_ctx;
    }

    // (142:0) {:else}
    function create_else_block_1(ctx) {
    	let skeleton;
    	let current;
    	skeleton = new Skeleton({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(skeleton.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(skeleton, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(skeleton.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(skeleton.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(skeleton, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(142:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (117:10) {:else}
    function create_else_block$1(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value_3 = /*category*/ ctx[16].children;
    	validate_each_argument(each_value_3);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*activeLevelOneAccordion, tabs, activeLevelTwoAccordion, activeLevelThreeAccordion, capitalizeFirstLetter, toggleAccordion, framework, vscode, token*/ 255) {
    				each_value_3 = /*category*/ ctx[16].children;
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_3(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value_3.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_3.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(117:10) {:else}",
    		ctx
    	});

    	return block;
    }

    // (113:10) {#if !category.children[0].children}
    function create_if_block$1(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value_2 = /*category*/ ctx[16].children;
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*tabs, framework, vscode, token*/ 15) {
    				each_value_2 = /*category*/ ctx[16].children;
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value_2.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_2.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(113:10) {#if !category.children[0].children}",
    		ctx
    	});

    	return block;
    }

    // (131:18) {#each subCategory.children as component}
    function create_each_block_4(ctx) {
    	let componentitem;
    	let current;

    	componentitem = new ComponentItem({
    			props: {
    				component: /*component*/ ctx[19],
    				framework: /*framework*/ ctx[2],
    				vscode: /*vscode*/ ctx[0],
    				token: /*token*/ ctx[3]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(componentitem.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(componentitem, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const componentitem_changes = {};
    			if (dirty & /*tabs*/ 2) componentitem_changes.component = /*component*/ ctx[19];
    			if (dirty & /*framework*/ 4) componentitem_changes.framework = /*framework*/ ctx[2];
    			if (dirty & /*vscode*/ 1) componentitem_changes.vscode = /*vscode*/ ctx[0];
    			if (dirty & /*token*/ 8) componentitem_changes.token = /*token*/ ctx[3];
    			componentitem.$set(componentitem_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(componentitem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(componentitem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(componentitem, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_4.name,
    		type: "each",
    		source: "(131:18) {#each subCategory.children as component}",
    		ctx
    	});

    	return block;
    }

    // (119:14) <Accordion                  isActive={activeLevelOneAccordion === mainIndex + 1 &&                    activeLevelTwoAccordion === subIndex + 1 &&                    activeLevelThreeAccordion === subSubIndex + 1}                  headerText={capitalizeFirstLetter(                    subCategory.name.replace("_", " ").trim()                  )}                  on:toggleAccordion={(event) => {                    toggleAccordion(event, subSubIndex + 1, 3, true);                  }}                >
    function create_default_slot_2(ctx) {
    	let div;
    	let current;
    	let each_value_4 = /*subCategory*/ ctx[22].children;
    	validate_each_argument(each_value_4);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "component-section");
    			add_location(div, file$1, 129, 16, 3914);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*tabs, framework, vscode, token*/ 15) {
    				each_value_4 = /*subCategory*/ ctx[22].children;
    				validate_each_argument(each_value_4);
    				let i;

    				for (i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_4(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_4.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_4.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(119:14) <Accordion                  isActive={activeLevelOneAccordion === mainIndex + 1 &&                    activeLevelTwoAccordion === subIndex + 1 &&                    activeLevelThreeAccordion === subSubIndex + 1}                  headerText={capitalizeFirstLetter(                    subCategory.name.replace(\\\"_\\\", \\\" \\\").trim()                  )}                  on:toggleAccordion={(event) => {                    toggleAccordion(event, subSubIndex + 1, 3, true);                  }}                >",
    		ctx
    	});

    	return block;
    }

    // (118:12) {#each category.children as subCategory, subSubIndex}
    function create_each_block_3(ctx) {
    	let accordion;
    	let current;

    	function toggleAccordion_handler(...args) {
    		return /*toggleAccordion_handler*/ ctx[10](/*subSubIndex*/ ctx[24], ...args);
    	}

    	accordion = new Accordion({
    			props: {
    				isActive: /*activeLevelOneAccordion*/ ctx[4] === /*mainIndex*/ ctx[15] + 1 && /*activeLevelTwoAccordion*/ ctx[5] === /*subIndex*/ ctx[18] + 1 && /*activeLevelThreeAccordion*/ ctx[6] === /*subSubIndex*/ ctx[24] + 1,
    				headerText: capitalizeFirstLetter(/*subCategory*/ ctx[22].name.replace("_", " ").trim()),
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	accordion.$on("toggleAccordion", toggleAccordion_handler);

    	const block = {
    		c: function create() {
    			create_component(accordion.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(accordion, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const accordion_changes = {};
    			if (dirty & /*activeLevelOneAccordion, tabs, activeLevelTwoAccordion, activeLevelThreeAccordion*/ 114) accordion_changes.isActive = /*activeLevelOneAccordion*/ ctx[4] === /*mainIndex*/ ctx[15] + 1 && /*activeLevelTwoAccordion*/ ctx[5] === /*subIndex*/ ctx[18] + 1 && /*activeLevelThreeAccordion*/ ctx[6] === /*subSubIndex*/ ctx[24] + 1;
    			if (dirty & /*tabs*/ 2) accordion_changes.headerText = capitalizeFirstLetter(/*subCategory*/ ctx[22].name.replace("_", " ").trim());

    			if (dirty & /*$$scope, tabs, framework, vscode, token*/ 134217743) {
    				accordion_changes.$$scope = { dirty, ctx };
    			}

    			accordion.$set(accordion_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(accordion.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(accordion.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(accordion, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(118:12) {#each category.children as subCategory, subSubIndex}",
    		ctx
    	});

    	return block;
    }

    // (114:12) {#each category.children as component}
    function create_each_block_2(ctx) {
    	let componentitem;
    	let current;

    	componentitem = new ComponentItem({
    			props: {
    				component: /*component*/ ctx[19],
    				framework: /*framework*/ ctx[2],
    				vscode: /*vscode*/ ctx[0],
    				token: /*token*/ ctx[3]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(componentitem.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(componentitem, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const componentitem_changes = {};
    			if (dirty & /*tabs*/ 2) componentitem_changes.component = /*component*/ ctx[19];
    			if (dirty & /*framework*/ 4) componentitem_changes.framework = /*framework*/ ctx[2];
    			if (dirty & /*vscode*/ 1) componentitem_changes.vscode = /*vscode*/ ctx[0];
    			if (dirty & /*token*/ 8) componentitem_changes.token = /*token*/ ctx[3];
    			componentitem.$set(componentitem_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(componentitem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(componentitem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(componentitem, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(114:12) {#each category.children as component}",
    		ctx
    	});

    	return block;
    }

    // (96:6) <Accordion          isActive={activeLevelOneAccordion === mainIndex + 1 &&            activeLevelTwoAccordion === subIndex + 1}          headerText={capitalizeFirstLetter(            category.name.replace("_", " ").trim()          )}          showActiveBorder={category.children[0].children}          on:toggleAccordion={(event) => {            toggleAccordion(              event,              subIndex + 1,              2,              !category.children[0].children            );          }}        >
    function create_default_slot_1(ctx) {
    	let div;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const if_block_creators = [create_if_block$1, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (!/*category*/ ctx[16].children[0].children) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "class", "component-section");
    			add_location(div, file$1, 111, 8, 3068);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_blocks[current_block_type_index].m(div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(div, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(96:6) <Accordion          isActive={activeLevelOneAccordion === mainIndex + 1 &&            activeLevelTwoAccordion === subIndex + 1}          headerText={capitalizeFirstLetter(            category.name.replace(\\\"_\\\", \\\" \\\").trim()          )}          showActiveBorder={category.children[0].children}          on:toggleAccordion={(event) => {            toggleAccordion(              event,              subIndex + 1,              2,              !category.children[0].children            );          }}        >",
    		ctx
    	});

    	return block;
    }

    // (95:4) {#each tab.children as category, subIndex}
    function create_each_block_1(ctx) {
    	let accordion;
    	let current;

    	function toggleAccordion_handler_1(...args) {
    		return /*toggleAccordion_handler_1*/ ctx[11](/*subIndex*/ ctx[18], /*category*/ ctx[16], ...args);
    	}

    	accordion = new Accordion({
    			props: {
    				isActive: /*activeLevelOneAccordion*/ ctx[4] === /*mainIndex*/ ctx[15] + 1 && /*activeLevelTwoAccordion*/ ctx[5] === /*subIndex*/ ctx[18] + 1,
    				headerText: capitalizeFirstLetter(/*category*/ ctx[16].name.replace("_", " ").trim()),
    				showActiveBorder: /*category*/ ctx[16].children[0].children,
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	accordion.$on("toggleAccordion", toggleAccordion_handler_1);

    	const block = {
    		c: function create() {
    			create_component(accordion.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(accordion, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const accordion_changes = {};
    			if (dirty & /*activeLevelOneAccordion, tabs, activeLevelTwoAccordion*/ 50) accordion_changes.isActive = /*activeLevelOneAccordion*/ ctx[4] === /*mainIndex*/ ctx[15] + 1 && /*activeLevelTwoAccordion*/ ctx[5] === /*subIndex*/ ctx[18] + 1;
    			if (dirty & /*tabs*/ 2) accordion_changes.headerText = capitalizeFirstLetter(/*category*/ ctx[16].name.replace("_", " ").trim());
    			if (dirty & /*tabs*/ 2) accordion_changes.showActiveBorder = /*category*/ ctx[16].children[0].children;

    			if (dirty & /*$$scope, tabs, framework, vscode, token, activeLevelOneAccordion, activeLevelTwoAccordion, activeLevelThreeAccordion*/ 134217855) {
    				accordion_changes.$$scope = { dirty, ctx };
    			}

    			accordion.$set(accordion_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(accordion.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(accordion.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(accordion, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(95:4) {#each tab.children as category, subIndex}",
    		ctx
    	});

    	return block;
    }

    // (84:2) <Accordion      {vscode}      isActive={activeLevelOneAccordion === mainIndex + 1}      headerText={tab.name.replace("-", "").trim() + " components"}      fontWeight="500"      showActiveBorder      showCheckoutButton={checkLicense(tab.name.replace("_", ""))}      on:toggleAccordion={(event) => {        toggleAccordion(event, mainIndex + 1, 1);      }}    >
    function create_default_slot(ctx) {
    	let t;
    	let current;
    	let each_value_1 = /*tab*/ ctx[13].children;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, t, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*activeLevelOneAccordion, tabs, activeLevelTwoAccordion, capitalizeFirstLetter, toggleAccordion, framework, vscode, token, activeLevelThreeAccordion*/ 255) {
    				each_value_1 = /*tab*/ ctx[13].children;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(t.parentNode, t);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(84:2) <Accordion      {vscode}      isActive={activeLevelOneAccordion === mainIndex + 1}      headerText={tab.name.replace(\\\"-\\\", \\\"\\\").trim() + \\\" components\\\"}      fontWeight=\\\"500\\\"      showActiveBorder      showCheckoutButton={checkLicense(tab.name.replace(\\\"_\\\", \\\"\\\"))}      on:toggleAccordion={(event) => {        toggleAccordion(event, mainIndex + 1, 1);      }}    >",
    		ctx
    	});

    	return block;
    }

    // (83:0) {#each tabs as tab, mainIndex (tab.name)}
    function create_each_block(key_1, ctx) {
    	let first;
    	let accordion;
    	let current;

    	function toggleAccordion_handler_2(...args) {
    		return /*toggleAccordion_handler_2*/ ctx[12](/*mainIndex*/ ctx[15], ...args);
    	}

    	accordion = new Accordion({
    			props: {
    				vscode: /*vscode*/ ctx[0],
    				isActive: /*activeLevelOneAccordion*/ ctx[4] === /*mainIndex*/ ctx[15] + 1,
    				headerText: /*tab*/ ctx[13].name.replace("-", "").trim() + " components",
    				fontWeight: "500",
    				showActiveBorder: true,
    				showCheckoutButton: /*checkLicense*/ ctx[8](/*tab*/ ctx[13].name.replace("_", "")),
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	accordion.$on("toggleAccordion", toggleAccordion_handler_2);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(accordion.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(accordion, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const accordion_changes = {};
    			if (dirty & /*vscode*/ 1) accordion_changes.vscode = /*vscode*/ ctx[0];
    			if (dirty & /*activeLevelOneAccordion, tabs*/ 18) accordion_changes.isActive = /*activeLevelOneAccordion*/ ctx[4] === /*mainIndex*/ ctx[15] + 1;
    			if (dirty & /*tabs*/ 2) accordion_changes.headerText = /*tab*/ ctx[13].name.replace("-", "").trim() + " components";
    			if (dirty & /*tabs*/ 2) accordion_changes.showCheckoutButton = /*checkLicense*/ ctx[8](/*tab*/ ctx[13].name.replace("_", ""));

    			if (dirty & /*$$scope, tabs, activeLevelOneAccordion, activeLevelTwoAccordion, framework, vscode, token, activeLevelThreeAccordion*/ 134217855) {
    				accordion_changes.$$scope = { dirty, ctx };
    			}

    			accordion.$set(accordion_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(accordion.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(accordion.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(accordion, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(83:0) {#each tabs as tab, mainIndex (tab.name)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let each_1_anchor;
    	let current;
    	let each_value = /*tabs*/ ctx[1];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*tab*/ ctx[13].name;
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	let each_1_else = null;

    	if (!each_value.length) {
    		each_1_else = create_else_block_1(ctx);
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();

    			if (each_1_else) {
    				each_1_else.c();
    			}
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);

    			if (each_1_else) {
    				each_1_else.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*vscode, activeLevelOneAccordion, tabs, checkLicense, toggleAccordion, activeLevelTwoAccordion, capitalizeFirstLetter, framework, token, activeLevelThreeAccordion*/ 511) {
    				each_value = /*tabs*/ ctx[1];
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, each_1_anchor.parentNode, outro_and_destroy_block, create_each_block, each_1_anchor, get_each_context);
    				check_outros();

    				if (each_value.length) {
    					if (each_1_else) {
    						group_outros();

    						transition_out(each_1_else, 1, 1, () => {
    							each_1_else = null;
    						});

    						check_outros();
    					}
    				} else if (!each_1_else) {
    					each_1_else = create_else_block_1(ctx);
    					each_1_else.c();
    					transition_in(each_1_else, 1);
    					each_1_else.m(each_1_anchor.parentNode, each_1_anchor);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (detaching) detach_dev(each_1_anchor);
    			if (each_1_else) each_1_else.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Tabs', slots, []);
    	let { vscode } = $$props;
    	let { tabs } = $$props;
    	let { framework } = $$props;
    	let { token = null } = $$props;
    	let { userDetails = [] } = $$props;
    	let activeLevelOneAccordion = 0;
    	let activeLevelTwoAccordion = 0;
    	let activeLevelThreeAccordion = 0;

    	const toggleAccordion = (event, accordionIndex, accordionLevel, animateToTop = false) => {
    		let el = event.detail.accordion;
    		var closest = el.closest(".accordion");

    		switch (accordionLevel) {
    			case 1:
    				$$invalidate(5, activeLevelTwoAccordion = 0);
    				$$invalidate(6, activeLevelThreeAccordion = 0);
    				if (activeLevelOneAccordion === accordionIndex) {
    					return $$invalidate(4, activeLevelOneAccordion = 0);
    				}
    				return $$invalidate(4, activeLevelOneAccordion = accordionIndex);
    			case 2:
    				if (animateToTop) {
    					setTimeout(
    						function () {
    							closest.scrollIntoView({ alignToTop: true, behavior: "smooth" });
    						},
    						200
    					);
    				}
    				$$invalidate(6, activeLevelThreeAccordion = 0);
    				if (activeLevelTwoAccordion === accordionIndex) {
    					return $$invalidate(5, activeLevelTwoAccordion = 0);
    				}
    				return $$invalidate(5, activeLevelTwoAccordion = accordionIndex);
    			case 3:
    				setTimeout(
    					function () {
    						closest.scrollIntoView({ alignToTop: true, behavior: "smooth" });
    					},
    					200
    				);
    				if (activeLevelThreeAccordion === accordionIndex) {
    					return $$invalidate(6, activeLevelThreeAccordion = 0);
    				}
    				return $$invalidate(6, activeLevelThreeAccordion = accordionIndex);
    		}
    	};

    	const checkLicense = license => {
    		return !userDetails.includes(license) && !userDetails.includes("pro");
    	};

    	const writable_props = ['vscode', 'tabs', 'framework', 'token', 'userDetails'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Tabs> was created with unknown prop '${key}'`);
    	});

    	const toggleAccordion_handler = (subSubIndex, event) => {
    		toggleAccordion(event, subSubIndex + 1, 3, true);
    	};

    	const toggleAccordion_handler_1 = (subIndex, category, event) => {
    		toggleAccordion(event, subIndex + 1, 2, !category.children[0].children);
    	};

    	const toggleAccordion_handler_2 = (mainIndex, event) => {
    		toggleAccordion(event, mainIndex + 1, 1);
    	};

    	$$self.$$set = $$props => {
    		if ('vscode' in $$props) $$invalidate(0, vscode = $$props.vscode);
    		if ('tabs' in $$props) $$invalidate(1, tabs = $$props.tabs);
    		if ('framework' in $$props) $$invalidate(2, framework = $$props.framework);
    		if ('token' in $$props) $$invalidate(3, token = $$props.token);
    		if ('userDetails' in $$props) $$invalidate(9, userDetails = $$props.userDetails);
    	};

    	$$self.$capture_state = () => ({
    		capitalizeFirstLetter,
    		componentLocked,
    		Accordion,
    		ComponentItem,
    		Skeleton,
    		vscode,
    		tabs,
    		framework,
    		token,
    		userDetails,
    		activeLevelOneAccordion,
    		activeLevelTwoAccordion,
    		activeLevelThreeAccordion,
    		toggleAccordion,
    		checkLicense
    	});

    	$$self.$inject_state = $$props => {
    		if ('vscode' in $$props) $$invalidate(0, vscode = $$props.vscode);
    		if ('tabs' in $$props) $$invalidate(1, tabs = $$props.tabs);
    		if ('framework' in $$props) $$invalidate(2, framework = $$props.framework);
    		if ('token' in $$props) $$invalidate(3, token = $$props.token);
    		if ('userDetails' in $$props) $$invalidate(9, userDetails = $$props.userDetails);
    		if ('activeLevelOneAccordion' in $$props) $$invalidate(4, activeLevelOneAccordion = $$props.activeLevelOneAccordion);
    		if ('activeLevelTwoAccordion' in $$props) $$invalidate(5, activeLevelTwoAccordion = $$props.activeLevelTwoAccordion);
    		if ('activeLevelThreeAccordion' in $$props) $$invalidate(6, activeLevelThreeAccordion = $$props.activeLevelThreeAccordion);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		vscode,
    		tabs,
    		framework,
    		token,
    		activeLevelOneAccordion,
    		activeLevelTwoAccordion,
    		activeLevelThreeAccordion,
    		toggleAccordion,
    		checkLicense,
    		userDetails,
    		toggleAccordion_handler,
    		toggleAccordion_handler_1,
    		toggleAccordion_handler_2
    	];
    }

    class Tabs extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			vscode: 0,
    			tabs: 1,
    			framework: 2,
    			token: 3,
    			userDetails: 9
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tabs",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*vscode*/ ctx[0] === undefined && !('vscode' in props)) {
    			console.warn("<Tabs> was created without expected prop 'vscode'");
    		}

    		if (/*tabs*/ ctx[1] === undefined && !('tabs' in props)) {
    			console.warn("<Tabs> was created without expected prop 'tabs'");
    		}

    		if (/*framework*/ ctx[2] === undefined && !('framework' in props)) {
    			console.warn("<Tabs> was created without expected prop 'framework'");
    		}
    	}

    	get vscode() {
    		throw new Error("<Tabs>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set vscode(value) {
    		throw new Error("<Tabs>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tabs() {
    		throw new Error("<Tabs>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tabs(value) {
    		throw new Error("<Tabs>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get framework() {
    		throw new Error("<Tabs>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set framework(value) {
    		throw new Error("<Tabs>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get token() {
    		throw new Error("<Tabs>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set token(value) {
    		throw new Error("<Tabs>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get userDetails() {
    		throw new Error("<Tabs>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set userDetails(value) {
    		throw new Error("<Tabs>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* webviews\components\Sidebar\AllComponents\AllComponents.svelte generated by Svelte v3.43.1 */

    const { Error: Error_1 } = globals;
    const file = "webviews\\components\\Sidebar\\AllComponents\\AllComponents.svelte";

    // (231:2) {#if (search && filteredComponents.length > 0) || (!search && tabs.length > 0)}
    function create_if_block_2(ctx) {
    	let customselect;
    	let updating_selectedFramework;
    	let t;
    	let copyinput;
    	let current;

    	function customselect_selectedFramework_binding(value) {
    		/*customselect_selectedFramework_binding*/ ctx[10](value);
    	}

    	let customselect_props = {};

    	if (/*framework*/ ctx[5] !== void 0) {
    		customselect_props.selectedFramework = /*framework*/ ctx[5];
    	}

    	customselect = new CustomSelect({
    			props: customselect_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(customselect, 'selectedFramework', customselect_selectedFramework_binding));
    	customselect.$on("onChangeFramework", /*changeFrameworkHandler*/ ctx[8]);

    	copyinput = new CopyInput({
    			props: { vscode: /*vscode*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(customselect.$$.fragment);
    			t = space();
    			create_component(copyinput.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(customselect, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(copyinput, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const customselect_changes = {};

    			if (!updating_selectedFramework && dirty & /*framework*/ 32) {
    				updating_selectedFramework = true;
    				customselect_changes.selectedFramework = /*framework*/ ctx[5];
    				add_flush_callback(() => updating_selectedFramework = false);
    			}

    			customselect.$set(customselect_changes);
    			const copyinput_changes = {};
    			if (dirty & /*vscode*/ 1) copyinput_changes.vscode = /*vscode*/ ctx[0];
    			copyinput.$set(copyinput_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(customselect.$$.fragment, local);
    			transition_in(copyinput.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(customselect.$$.fragment, local);
    			transition_out(copyinput.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(customselect, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(copyinput, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(231:2) {#if (search && filteredComponents.length > 0) || (!search && tabs.length > 0)}",
    		ctx
    	});

    	return block;
    }

    // (244:2) {#if !searchIsDisabled}
    function create_if_block_1(ctx) {
    	let searchinputfiled;
    	let updating_search;
    	let current;

    	function searchinputfiled_search_binding(value) {
    		/*searchinputfiled_search_binding*/ ctx[11](value);
    	}

    	let searchinputfiled_props = {
    		searchIsDisabled: /*searchIsDisabled*/ ctx[4]
    	};

    	if (/*search*/ ctx[1] !== void 0) {
    		searchinputfiled_props.search = /*search*/ ctx[1];
    	}

    	searchinputfiled = new SearchInputFiled({
    			props: searchinputfiled_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(searchinputfiled, 'search', searchinputfiled_search_binding));
    	searchinputfiled.$on("filterComponents", /*filterComponents*/ ctx[9]);

    	const block = {
    		c: function create() {
    			create_component(searchinputfiled.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(searchinputfiled, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const searchinputfiled_changes = {};
    			if (dirty & /*searchIsDisabled*/ 16) searchinputfiled_changes.searchIsDisabled = /*searchIsDisabled*/ ctx[4];

    			if (!updating_search && dirty & /*search*/ 2) {
    				updating_search = true;
    				searchinputfiled_changes.search = /*search*/ ctx[1];
    				add_flush_callback(() => updating_search = false);
    			}

    			searchinputfiled.$set(searchinputfiled_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(searchinputfiled.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(searchinputfiled.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(searchinputfiled, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(244:2) {#if !searchIsDisabled}",
    		ctx
    	});

    	return block;
    }

    // (260:2) {:else}
    function create_else_block(ctx) {
    	let tabs_1;
    	let current;

    	tabs_1 = new Tabs({
    			props: {
    				vscode: /*vscode*/ ctx[0],
    				tabs: /*tabs*/ ctx[3],
    				framework: /*framework*/ ctx[5],
    				token: /*token*/ ctx[6],
    				userDetails: /*userDetails*/ ctx[7]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(tabs_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(tabs_1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const tabs_1_changes = {};
    			if (dirty & /*vscode*/ 1) tabs_1_changes.vscode = /*vscode*/ ctx[0];
    			if (dirty & /*tabs*/ 8) tabs_1_changes.tabs = /*tabs*/ ctx[3];
    			if (dirty & /*framework*/ 32) tabs_1_changes.framework = /*framework*/ ctx[5];
    			if (dirty & /*token*/ 64) tabs_1_changes.token = /*token*/ ctx[6];
    			if (dirty & /*userDetails*/ 128) tabs_1_changes.userDetails = /*userDetails*/ ctx[7];
    			tabs_1.$set(tabs_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tabs_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tabs_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tabs_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(260:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (252:2) {#if search.length > 0}
    function create_if_block(ctx) {
    	let filteredcomponents;
    	let current;

    	filteredcomponents = new FilteredComponents({
    			props: {
    				vscode: /*vscode*/ ctx[0],
    				filteredComponents: /*filteredComponents*/ ctx[2],
    				search: /*search*/ ctx[1],
    				framework: /*framework*/ ctx[5],
    				token: /*token*/ ctx[6]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(filteredcomponents.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(filteredcomponents, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const filteredcomponents_changes = {};
    			if (dirty & /*vscode*/ 1) filteredcomponents_changes.vscode = /*vscode*/ ctx[0];
    			if (dirty & /*filteredComponents*/ 4) filteredcomponents_changes.filteredComponents = /*filteredComponents*/ ctx[2];
    			if (dirty & /*search*/ 2) filteredcomponents_changes.search = /*search*/ ctx[1];
    			if (dirty & /*framework*/ 32) filteredcomponents_changes.framework = /*framework*/ ctx[5];
    			if (dirty & /*token*/ 64) filteredcomponents_changes.token = /*token*/ ctx[6];
    			filteredcomponents.$set(filteredcomponents_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(filteredcomponents.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(filteredcomponents.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(filteredcomponents, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(252:2) {#if search.length > 0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let current_block_type_index;
    	let if_block2;
    	let t2;
    	let helpandfeedback;
    	let updating_token;
    	let updating_userDetails;
    	let current;
    	let if_block0 = (/*search*/ ctx[1] && /*filteredComponents*/ ctx[2].length > 0 || !/*search*/ ctx[1] && /*tabs*/ ctx[3].length > 0) && create_if_block_2(ctx);
    	let if_block1 = !/*searchIsDisabled*/ ctx[4] && create_if_block_1(ctx);
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*search*/ ctx[1].length > 0) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block2 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	function helpandfeedback_token_binding(value) {
    		/*helpandfeedback_token_binding*/ ctx[12](value);
    	}

    	function helpandfeedback_userDetails_binding(value) {
    		/*helpandfeedback_userDetails_binding*/ ctx[13](value);
    	}

    	let helpandfeedback_props = { vscode: /*vscode*/ ctx[0] };

    	if (/*token*/ ctx[6] !== void 0) {
    		helpandfeedback_props.token = /*token*/ ctx[6];
    	}

    	if (/*userDetails*/ ctx[7] !== void 0) {
    		helpandfeedback_props.userDetails = /*userDetails*/ ctx[7];
    	}

    	helpandfeedback = new HelpAndFeedback({
    			props: helpandfeedback_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(helpandfeedback, 'token', helpandfeedback_token_binding));
    	binding_callbacks.push(() => bind(helpandfeedback, 'userDetails', helpandfeedback_userDetails_binding));

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if_block2.c();
    			t2 = space();
    			create_component(helpandfeedback.$$.fragment);
    			attr_dev(div, "class", "main-section svelte-ttvto9");
    			add_location(div, file, 229, 0, 6030);
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block0) if_block0.m(div, null);
    			append_dev(div, t0);
    			if (if_block1) if_block1.m(div, null);
    			append_dev(div, t1);
    			if_blocks[current_block_type_index].m(div, null);
    			insert_dev(target, t2, anchor);
    			mount_component(helpandfeedback, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*search*/ ctx[1] && /*filteredComponents*/ ctx[2].length > 0 || !/*search*/ ctx[1] && /*tabs*/ ctx[3].length > 0) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*search, filteredComponents, tabs*/ 14) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div, t0);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (!/*searchIsDisabled*/ ctx[4]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*searchIsDisabled*/ 16) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_1(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div, t1);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block2 = if_blocks[current_block_type_index];

    				if (!if_block2) {
    					if_block2 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block2.c();
    				} else {
    					if_block2.p(ctx, dirty);
    				}

    				transition_in(if_block2, 1);
    				if_block2.m(div, null);
    			}

    			const helpandfeedback_changes = {};
    			if (dirty & /*vscode*/ 1) helpandfeedback_changes.vscode = /*vscode*/ ctx[0];

    			if (!updating_token && dirty & /*token*/ 64) {
    				updating_token = true;
    				helpandfeedback_changes.token = /*token*/ ctx[6];
    				add_flush_callback(() => updating_token = false);
    			}

    			if (!updating_userDetails && dirty & /*userDetails*/ 128) {
    				updating_userDetails = true;
    				helpandfeedback_changes.userDetails = /*userDetails*/ ctx[7];
    				add_flush_callback(() => updating_userDetails = false);
    			}

    			helpandfeedback.$set(helpandfeedback_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(if_block2);
    			transition_in(helpandfeedback.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(if_block2);
    			transition_out(helpandfeedback.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if_blocks[current_block_type_index].d();
    			if (detaching) detach_dev(t2);
    			destroy_component(helpandfeedback, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('AllComponents', slots, []);
    	let { vscode } = $$props;
    	let search = "";
    	let filteredComponents;
    	let timer;
    	let tabs = [];
    	let reducedTabs;
    	let searchIsDisabled = true;
    	let framework = "html";
    	let token = null;
    	let userDetails = [];

    	const frameworks = {
    		html: {
    			text: "Tailwind CSS",
    			value: "html",
    			icon: "tailwind"
    		},
    		angular: {
    			text: "Angular",
    			value: "angular",
    			icon: "angular"
    		},
    		react: {
    			text: "React",
    			value: "react",
    			icon: "react"
    		},
    		vue: { text: "Vue", value: "vue", icon: "vue" }
    	};

    	const resetState = () => {
    		$$invalidate(4, searchIsDisabled = true);
    		$$invalidate(1, search = "");
    		$$invalidate(2, filteredComponents = "");
    		$$invalidate(3, tabs = []);
    		reducedTabs = "";
    	};

    	onMount(async () => {
    		// vscode.postMessage({
    		//   type: "clearCache",
    		// });
    		vscode.postMessage({ type: "getDataFromCache" });
    	});

    	const extensionMessageHandler = async event => {
    		const message = event.data; // The JSON data our extension sent

    		switch (message.type) {
    			case "updateFramework":
    				{
    					$$invalidate(5, framework = message.value);
    					break;
    				}
    			case "gotDataFromCache":
    				if (message.framework) {
    					$$invalidate(5, framework = message.framework);
    				}
    				if (message.token) {
    					$$invalidate(6, token = message.token);
    				}
    				if (message.userDetails) {
    					$$invalidate(7, userDetails = message.userDetails);
    				}
    				if (!message.components) {
    					if (token) {
    						getDataFromApi(token);
    					} else {
    						getDataFromApi();
    					}

    					return;
    				}
    				const componentsData = JSON.parse(message.components);
    				$$invalidate(3, tabs = componentsData.tabs);
    				reducedTabs = componentsData.reducedTabs;
    				$$invalidate(4, searchIsDisabled = false);
    				break;
    			case "refresh":
    				{
    					resetState();
    					vscode.postMessage({ type: "clearCache" });

    					if (message.userDetails) {
    						$$invalidate(7, userDetails = message.userDetails);
    					}

    					if (message.token || token) {
    						vscode.postMessage({ type: "killSignin" });

    						if (token) {
    							getDataFromApi(token);
    							return;
    						}

    						$$invalidate(6, token = message.token);
    						getDataFromApi(token);
    						return;
    					} else {
    						$$invalidate(6, token = null);
    						getDataFromApi();
    					}

    					break;
    				}
    			case "cancelSubscription":
    				resetState();
    				$$invalidate(6, token = null);
    				getDataFromApi();
    				break;
    		}
    	};

    	window.addEventListener("message", extensionMessageHandler);

    	const changeFrameworkHandler = event => {
    		if (event.detail.selectedOption === framework) {
    			return;
    		}

    		vscode.postMessage({
    			type: "cacheData",
    			key: "framework",
    			value: event.detail.selectedOption
    		});
    	};

    	const getDataFromApi = async (token = null) => {
    		vscode.postMessage({
    			type: "onMessage",
    			message: "Fetching the latest components."
    		});

    		try {
    			let res;

    			const url = // "https://7jn82juu23.execute-api.us-west-1.amazonaws.com/dev/components/v2/list";
    			// "https://7jn82juu23.execute-api.us-west-1.amazonaws.com/dev/components/v3/list";
    			"https://7jn82juu23.execute-api.us-west-1.amazonaws.com/dev/components/v3/list";

    			if (!token) {
    				res = await fetch(url);
    			} else {
    				res = await fetch(url, {
    					method: "GET",
    					headers: new Headers({
    							Authorization: token,
    							"Content-Type": "application/json"
    						})
    				});
    			}

    			resetState();
    			const responseData = await res.json();

    			if (!responseData.success) {
    				if (res.status === 401 && token) {
    					getDataFromApi();
    					vscode.postMessage({ type: "removeToken" });
    					throw new Error(responseData.error.error + ". Fetching free components.");
    				}

    				throw new Error(responseData.error.error);
    			}

    			$$invalidate(3, tabs = sortComponents(responseData.data.tree));

    			// console.log("Sorted Tabs: ", tabs);
    			reducedTabs = reduceTabs(tabs);

    			vscode.postMessage({
    				type: "cacheData",
    				key: "components",
    				value: JSON.stringify({ tabs, reducedTabs })
    			});

    			$$invalidate(4, searchIsDisabled = false);
    		} catch(error) {
    			resetState();

    			vscode.postMessage({
    				type: "onError",
    				message: error.message || JSON.stringify(error)
    			});
    		}
    	};

    	const filterComponents = event => {
    		clearTimeout(timer);

    		timer = setTimeout(
    			() => {
    				$$invalidate(1, search = event.detail.value.trim());

    				$$invalidate(2, filteredComponents = reducedTabs.filter(component => {
    					return component.name.toLocaleLowerCase().includes(search.toLocaleLowerCase());
    				}));

    				const freeComponents = filteredComponents.filter(component => !component.locked);
    				const paidComponents = filteredComponents.filter(component => component.locked);
    				$$invalidate(2, filteredComponents = [...freeComponents, ...paidComponents]);
    			},
    			200
    		);
    	};

    	onDestroy(() => {
    		window.removeEventListener("message", extensionMessageHandler);
    	});

    	const writable_props = ['vscode'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<AllComponents> was created with unknown prop '${key}'`);
    	});

    	function customselect_selectedFramework_binding(value) {
    		framework = value;
    		$$invalidate(5, framework);
    	}

    	function searchinputfiled_search_binding(value) {
    		search = value;
    		$$invalidate(1, search);
    	}

    	function helpandfeedback_token_binding(value) {
    		token = value;
    		$$invalidate(6, token);
    	}

    	function helpandfeedback_userDetails_binding(value) {
    		userDetails = value;
    		$$invalidate(7, userDetails);
    	}

    	$$self.$$set = $$props => {
    		if ('vscode' in $$props) $$invalidate(0, vscode = $$props.vscode);
    	};

    	$$self.$capture_state = () => ({
    		onDestroy,
    		onMount,
    		sortComponents,
    		reduceTabs,
    		CopyInput,
    		CustomSelect,
    		FilteredComponents,
    		HelpAndFeedback,
    		SearchInputFiled,
    		Tabs,
    		vscode,
    		search,
    		filteredComponents,
    		timer,
    		tabs,
    		reducedTabs,
    		searchIsDisabled,
    		framework,
    		token,
    		userDetails,
    		frameworks,
    		resetState,
    		extensionMessageHandler,
    		changeFrameworkHandler,
    		getDataFromApi,
    		filterComponents
    	});

    	$$self.$inject_state = $$props => {
    		if ('vscode' in $$props) $$invalidate(0, vscode = $$props.vscode);
    		if ('search' in $$props) $$invalidate(1, search = $$props.search);
    		if ('filteredComponents' in $$props) $$invalidate(2, filteredComponents = $$props.filteredComponents);
    		if ('timer' in $$props) timer = $$props.timer;
    		if ('tabs' in $$props) $$invalidate(3, tabs = $$props.tabs);
    		if ('reducedTabs' in $$props) reducedTabs = $$props.reducedTabs;
    		if ('searchIsDisabled' in $$props) $$invalidate(4, searchIsDisabled = $$props.searchIsDisabled);
    		if ('framework' in $$props) $$invalidate(5, framework = $$props.framework);
    		if ('token' in $$props) $$invalidate(6, token = $$props.token);
    		if ('userDetails' in $$props) $$invalidate(7, userDetails = $$props.userDetails);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		vscode,
    		search,
    		filteredComponents,
    		tabs,
    		searchIsDisabled,
    		framework,
    		token,
    		userDetails,
    		changeFrameworkHandler,
    		filterComponents,
    		customselect_selectedFramework_binding,
    		searchinputfiled_search_binding,
    		helpandfeedback_token_binding,
    		helpandfeedback_userDetails_binding
    	];
    }

    class AllComponents extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { vscode: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "AllComponents",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*vscode*/ ctx[0] === undefined && !('vscode' in props)) {
    			console.warn("<AllComponents> was created without expected prop 'vscode'");
    		}
    	}

    	get vscode() {
    		throw new Error_1("<AllComponents>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set vscode(value) {
    		throw new Error_1("<AllComponents>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* webviews\components\Sidebar\Sidebar.svelte generated by Svelte v3.43.1 */

    function create_fragment(ctx) {
    	let allcomponents;
    	let current;

    	allcomponents = new AllComponents({
    			props: { vscode: /*vscode*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(allcomponents.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(allcomponents, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(allcomponents.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(allcomponents.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(allcomponents, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Sidebar', slots, []);
    	const vscode = acquireVsCodeApi();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Sidebar> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ vscode, AllComponents });
    	return [vscode];
    }

    class Sidebar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Sidebar",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new Sidebar({
        target: document.body,
    });

    return app;

})();
//# sourceMappingURL=Sidebar.js.map
