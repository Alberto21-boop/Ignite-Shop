var app = (function () {
    'use strict';

    function noop() { }
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
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
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
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
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

    /* webviews\components\UI\Logo.svelte generated by Svelte v3.43.1 */

    const file$5 = "webviews\\components\\UI\\Logo.svelte";

    function create_fragment$5(ctx) {
    	let svg;
    	let path0;
    	let path1;
    	let path2;
    	let path3;
    	let path4;
    	let path5;
    	let path6;
    	let path7;
    	let defs;
    	let linearGradient0;
    	let stop0;
    	let stop1;
    	let linearGradient1;
    	let stop2;
    	let stop3;
    	let linearGradient2;
    	let stop4;
    	let stop5;
    	let linearGradient3;
    	let stop6;
    	let stop7;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			path3 = svg_element("path");
    			path4 = svg_element("path");
    			path5 = svg_element("path");
    			path6 = svg_element("path");
    			path7 = svg_element("path");
    			defs = svg_element("defs");
    			linearGradient0 = svg_element("linearGradient");
    			stop0 = svg_element("stop");
    			stop1 = svg_element("stop");
    			linearGradient1 = svg_element("linearGradient");
    			stop2 = svg_element("stop");
    			stop3 = svg_element("stop");
    			linearGradient2 = svg_element("linearGradient");
    			stop4 = svg_element("stop");
    			stop5 = svg_element("stop");
    			linearGradient3 = svg_element("linearGradient");
    			stop6 = svg_element("stop");
    			stop7 = svg_element("stop");
    			attr_dev(path0, "d", "M10.143 28.16C12.0394 28.16 13.7237 27.7162 15.1958 26.8285C16.693 25.9161 17.8657 24.6832 18.7141 23.1296C19.5874 21.5515 20.0241 19.7761 20.0241 17.8034C20.0241 15.806 19.5874 14.0306 18.7141 12.4771C17.8657 10.9236 16.693 9.70297 15.1958 8.81525C13.7237 7.90288 12.0394 7.44669 10.143 7.44669C8.57105 7.44669 7.16125 7.75493 5.91365 8.3714C4.66604 8.98786 3.63053 9.82626 2.80711 10.8866V0.160034H0V27.7162H2.80711V24.4982C3.55567 25.6572 4.57871 26.5572 5.87622 27.1983C7.17373 27.8395 8.596 28.16 10.143 28.16ZM9.99332 25.3859C8.6459 25.3859 7.42325 25.053 6.32536 24.3872C5.25242 23.7215 4.39157 22.8214 3.74281 21.6871C3.11901 20.5282 2.80711 19.2336 2.80711 17.8034C2.80711 16.3732 3.11901 15.0909 3.74281 13.9566C4.39157 12.7976 5.25242 11.8853 6.32536 11.2195C7.42325 10.5537 8.6459 10.2208 9.99332 10.2208C11.3407 10.2208 12.5384 10.5537 13.5864 11.2195C14.6594 11.8853 15.4953 12.7853 16.0941 13.9196C16.7179 15.0539 17.0298 16.3485 17.0298 17.8034C17.0298 19.2336 16.7179 20.5282 16.0941 21.6871C15.4953 22.8214 14.6594 23.7215 13.5864 24.3872C12.5384 25.053 11.3407 25.3859 9.99332 25.3859Z");
    			attr_dev(path0, "fill", "white");
    			add_location(path0, file$5, 7, 2, 116);
    			attr_dev(path1, "d", "M10.143 28.16C12.0394 28.16 13.7237 27.7162 15.1958 26.8285C16.693 25.9161 17.8657 24.6832 18.7141 23.1296C19.5874 21.5515 20.0241 19.7761 20.0241 17.8034C20.0241 15.806 19.5874 14.0306 18.7141 12.4771C17.8657 10.9236 16.693 9.70297 15.1958 8.81525C13.7237 7.90288 12.0394 7.44669 10.143 7.44669C8.57105 7.44669 7.16125 7.75493 5.91365 8.3714C4.66604 8.98786 3.63053 9.82626 2.80711 10.8866V0.160034H0V27.7162H2.80711V24.4982C3.55567 25.6572 4.57871 26.5572 5.87622 27.1983C7.17373 27.8395 8.596 28.16 10.143 28.16ZM9.99332 25.3859C8.6459 25.3859 7.42325 25.053 6.32536 24.3872C5.25242 23.7215 4.39157 22.8214 3.74281 21.6871C3.11901 20.5282 2.80711 19.2336 2.80711 17.8034C2.80711 16.3732 3.11901 15.0909 3.74281 13.9566C4.39157 12.7976 5.25242 11.8853 6.32536 11.2195C7.42325 10.5537 8.6459 10.2208 9.99332 10.2208C11.3407 10.2208 12.5384 10.5537 13.5864 11.2195C14.6594 11.8853 15.4953 12.7853 16.0941 13.9196C16.7179 15.0539 17.0298 16.3485 17.0298 17.8034C17.0298 19.2336 16.7179 20.5282 16.0941 21.6871C15.4953 22.8214 14.6594 23.7215 13.5864 24.3872C12.5384 25.053 11.3407 25.3859 9.99332 25.3859Z");
    			attr_dev(path1, "fill", "url(#paint0_linear_927:3492)");
    			attr_dev(path1, "fill-opacity", "0.75");
    			add_location(path1, file$5, 11, 2, 1263);
    			attr_dev(path2, "d", "M24.2157 27.7162H27.0228V0.160034H24.2157V27.7162Z");
    			attr_dev(path2, "fill", "white");
    			add_location(path2, file$5, 16, 2, 2458);
    			attr_dev(path3, "d", "M24.2157 27.7162H27.0228V0.160034H24.2157V27.7162Z");
    			attr_dev(path3, "fill", "url(#paint1_linear_927:3492)");
    			attr_dev(path3, "fill-opacity", "0.75");
    			add_location(path3, file$5, 17, 2, 2538);
    			attr_dev(path4, "d", "M41.4145 28.16C43.2859 28.16 44.9827 27.7162 46.5048 26.8285C48.0518 25.9407 49.2869 24.7201 50.2102 23.1666C51.1334 21.5885 51.595 19.7884 51.595 17.7664C51.595 15.769 51.1459 13.9936 50.2476 12.4401C49.3743 10.8866 48.1641 9.66598 46.6171 8.77826C45.095 7.89055 43.3608 7.44669 41.4145 7.44669C39.4683 7.44669 37.7216 7.90288 36.1746 8.81525C34.6525 9.70297 33.4423 10.9236 32.5441 12.4771C31.6458 14.0306 31.1967 15.7937 31.1967 17.7664C31.1967 19.7637 31.6458 21.5515 32.5441 23.1296C33.4673 24.6832 34.7024 25.9161 36.2495 26.8285C37.7965 27.7162 39.5182 28.16 41.4145 28.16ZM41.4145 25.3859C40.0671 25.3859 38.8445 25.053 37.7466 24.3872C36.6736 23.7215 35.8128 22.8091 35.164 21.6501C34.5153 20.4912 34.1909 19.1966 34.1909 17.7664C34.1909 16.3362 34.5153 15.0539 35.164 13.9196C35.8128 12.7853 36.6736 11.8853 37.7466 11.2195C38.8445 10.5537 40.0671 10.2208 41.4145 10.2208C42.762 10.2208 43.9721 10.5537 45.0451 11.2195C46.143 11.8853 47.0038 12.7853 47.6276 13.9196C48.2764 15.0539 48.6007 16.3362 48.6007 17.7664C48.6007 19.1966 48.2764 20.4912 47.6276 21.6501C47.0038 22.8091 46.143 23.7215 45.0451 24.3872C43.9721 25.053 42.762 25.3859 41.4145 25.3859Z");
    			attr_dev(path4, "fill", "white");
    			add_location(path4, file$5, 22, 2, 2679);
    			attr_dev(path5, "d", "M41.4145 28.16C43.2859 28.16 44.9827 27.7162 46.5048 26.8285C48.0518 25.9407 49.2869 24.7201 50.2102 23.1666C51.1334 21.5885 51.595 19.7884 51.595 17.7664C51.595 15.769 51.1459 13.9936 50.2476 12.4401C49.3743 10.8866 48.1641 9.66598 46.6171 8.77826C45.095 7.89055 43.3608 7.44669 41.4145 7.44669C39.4683 7.44669 37.7216 7.90288 36.1746 8.81525C34.6525 9.70297 33.4423 10.9236 32.5441 12.4771C31.6458 14.0306 31.1967 15.7937 31.1967 17.7664C31.1967 19.7637 31.6458 21.5515 32.5441 23.1296C33.4673 24.6832 34.7024 25.9161 36.2495 26.8285C37.7965 27.7162 39.5182 28.16 41.4145 28.16ZM41.4145 25.3859C40.0671 25.3859 38.8445 25.053 37.7466 24.3872C36.6736 23.7215 35.8128 22.8091 35.164 21.6501C34.5153 20.4912 34.1909 19.1966 34.1909 17.7664C34.1909 16.3362 34.5153 15.0539 35.164 13.9196C35.8128 12.7853 36.6736 11.8853 37.7466 11.2195C38.8445 10.5537 40.0671 10.2208 41.4145 10.2208C42.762 10.2208 43.9721 10.5537 45.0451 11.2195C46.143 11.8853 47.0038 12.7853 47.6276 13.9196C48.2764 15.0539 48.6007 16.3362 48.6007 17.7664C48.6007 19.1966 48.2764 20.4912 47.6276 21.6501C47.0038 22.8091 46.143 23.7215 45.0451 24.3872C43.9721 25.053 42.762 25.3859 41.4145 25.3859Z");
    			attr_dev(path5, "fill", "url(#paint2_linear_927:3492)");
    			attr_dev(path5, "fill-opacity", "0.75");
    			add_location(path5, file$5, 26, 2, 3887);
    			attr_dev(path6, "d", "M52.5959 27.7162H56.0767L61.3167 20.1706L66.5566 27.7162H70L63.0009 17.8034L70 7.89055H66.5566L61.3167 15.4361L56.0767 7.89055H52.6333L59.6324 17.8034L52.5959 27.7162Z");
    			attr_dev(path6, "fill", "white");
    			add_location(path6, file$5, 31, 2, 5143);
    			attr_dev(path7, "d", "M52.5959 27.7162H56.0767L61.3167 20.1706L66.5566 27.7162H70L63.0009 17.8034L70 7.89055H66.5566L61.3167 15.4361L56.0767 7.89055H52.6333L59.6324 17.8034L52.5959 27.7162Z");
    			attr_dev(path7, "fill", "url(#paint3_linear_927:3492)");
    			attr_dev(path7, "fill-opacity", "0.75");
    			add_location(path7, file$5, 35, 2, 5353);
    			attr_dev(stop0, "stop-color", "#A2FACF");
    			add_location(stop0, file$5, 49, 6, 5811);
    			attr_dev(stop1, "offset", "1");
    			attr_dev(stop1, "stop-color", "#64ACFF");
    			add_location(stop1, file$5, 50, 6, 5848);
    			attr_dev(linearGradient0, "id", "paint0_linear_927:3492");
    			attr_dev(linearGradient0, "x1", "-2.66765e-08");
    			attr_dev(linearGradient0, "y1", "3.66003");
    			attr_dev(linearGradient0, "x2", "69.8689");
    			attr_dev(linearGradient0, "y2", "4.13563");
    			attr_dev(linearGradient0, "gradientUnits", "userSpaceOnUse");
    			add_location(linearGradient0, file$5, 41, 4, 5623);
    			attr_dev(stop2, "stop-color", "#A2FACF");
    			add_location(stop2, file$5, 60, 6, 6105);
    			attr_dev(stop3, "offset", "1");
    			attr_dev(stop3, "stop-color", "#64ACFF");
    			add_location(stop3, file$5, 61, 6, 6142);
    			attr_dev(linearGradient1, "id", "paint1_linear_927:3492");
    			attr_dev(linearGradient1, "x1", "-2.66765e-08");
    			attr_dev(linearGradient1, "y1", "3.66003");
    			attr_dev(linearGradient1, "x2", "69.8689");
    			attr_dev(linearGradient1, "y2", "4.13563");
    			attr_dev(linearGradient1, "gradientUnits", "userSpaceOnUse");
    			add_location(linearGradient1, file$5, 52, 4, 5917);
    			attr_dev(stop4, "stop-color", "#A2FACF");
    			add_location(stop4, file$5, 71, 6, 6399);
    			attr_dev(stop5, "offset", "1");
    			attr_dev(stop5, "stop-color", "#64ACFF");
    			add_location(stop5, file$5, 72, 6, 6436);
    			attr_dev(linearGradient2, "id", "paint2_linear_927:3492");
    			attr_dev(linearGradient2, "x1", "-2.66765e-08");
    			attr_dev(linearGradient2, "y1", "3.66003");
    			attr_dev(linearGradient2, "x2", "69.8689");
    			attr_dev(linearGradient2, "y2", "4.13563");
    			attr_dev(linearGradient2, "gradientUnits", "userSpaceOnUse");
    			add_location(linearGradient2, file$5, 63, 4, 6211);
    			attr_dev(stop6, "stop-color", "#A2FACF");
    			add_location(stop6, file$5, 82, 6, 6693);
    			attr_dev(stop7, "offset", "1");
    			attr_dev(stop7, "stop-color", "#64ACFF");
    			add_location(stop7, file$5, 83, 6, 6730);
    			attr_dev(linearGradient3, "id", "paint3_linear_927:3492");
    			attr_dev(linearGradient3, "x1", "-2.66765e-08");
    			attr_dev(linearGradient3, "y1", "3.66003");
    			attr_dev(linearGradient3, "x2", "69.8689");
    			attr_dev(linearGradient3, "y2", "4.13563");
    			attr_dev(linearGradient3, "gradientUnits", "userSpaceOnUse");
    			add_location(linearGradient3, file$5, 74, 4, 6505);
    			add_location(defs, file$5, 40, 2, 5611);
    			attr_dev(svg, "width", "70");
    			attr_dev(svg, "height", "29");
    			attr_dev(svg, "viewBox", "0 0 70 29");
    			attr_dev(svg, "fill", "none");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			add_location(svg, file$5, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    			append_dev(svg, path2);
    			append_dev(svg, path3);
    			append_dev(svg, path4);
    			append_dev(svg, path5);
    			append_dev(svg, path6);
    			append_dev(svg, path7);
    			append_dev(svg, defs);
    			append_dev(defs, linearGradient0);
    			append_dev(linearGradient0, stop0);
    			append_dev(linearGradient0, stop1);
    			append_dev(defs, linearGradient1);
    			append_dev(linearGradient1, stop2);
    			append_dev(linearGradient1, stop3);
    			append_dev(defs, linearGradient2);
    			append_dev(linearGradient2, stop4);
    			append_dev(linearGradient2, stop5);
    			append_dev(defs, linearGradient3);
    			append_dev(linearGradient3, stop6);
    			append_dev(linearGradient3, stop7);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
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

    function instance$5($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Logo', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Logo> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Logo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Logo",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* webviews\components\UI\Spinner.svelte generated by Svelte v3.43.1 */

    const file$4 = "webviews\\components\\UI\\Spinner.svelte";

    function create_fragment$4(ctx) {
    	let svg;
    	let path0;
    	let path1;
    	let path2;
    	let path3;
    	let path4;
    	let path5;
    	let path6;
    	let path7;
    	let defs;
    	let linearGradient0;
    	let stop0;
    	let stop1;
    	let linearGradient1;
    	let stop2;
    	let stop3;
    	let linearGradient2;
    	let stop4;
    	let stop5;
    	let linearGradient3;
    	let stop6;
    	let stop7;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			path3 = svg_element("path");
    			path4 = svg_element("path");
    			path5 = svg_element("path");
    			path6 = svg_element("path");
    			path7 = svg_element("path");
    			defs = svg_element("defs");
    			linearGradient0 = svg_element("linearGradient");
    			stop0 = svg_element("stop");
    			stop1 = svg_element("stop");
    			linearGradient1 = svg_element("linearGradient");
    			stop2 = svg_element("stop");
    			stop3 = svg_element("stop");
    			linearGradient2 = svg_element("linearGradient");
    			stop4 = svg_element("stop");
    			stop5 = svg_element("stop");
    			linearGradient3 = svg_element("linearGradient");
    			stop6 = svg_element("stop");
    			stop7 = svg_element("stop");
    			attr_dev(path0, "d", "M10.143 28.16C12.0394 28.16 13.7237 27.7162 15.1958 26.8285C16.693 25.9161 17.8657 24.6832 18.7141 23.1296C19.5874 21.5515 20.0241 19.7761 20.0241 17.8034C20.0241 15.806 19.5874 14.0306 18.7141 12.4771C17.8657 10.9236 16.693 9.70297 15.1958 8.81525C13.7237 7.90288 12.0394 7.44669 10.143 7.44669C8.57105 7.44669 7.16125 7.75493 5.91365 8.3714C4.66604 8.98786 3.63053 9.82626 2.80711 10.8866V0.160034H0V27.7162H2.80711V24.4982C3.55567 25.6572 4.57871 26.5572 5.87622 27.1983C7.17373 27.8395 8.596 28.16 10.143 28.16ZM9.99332 25.3859C8.6459 25.3859 7.42325 25.053 6.32536 24.3872C5.25242 23.7215 4.39157 22.8214 3.74281 21.6871C3.11901 20.5282 2.80711 19.2336 2.80711 17.8034C2.80711 16.3732 3.11901 15.0909 3.74281 13.9566C4.39157 12.7976 5.25242 11.8853 6.32536 11.2195C7.42325 10.5537 8.6459 10.2208 9.99332 10.2208C11.3407 10.2208 12.5384 10.5537 13.5864 11.2195C14.6594 11.8853 15.4953 12.7853 16.0941 13.9196C16.7179 15.0539 17.0298 16.3485 17.0298 17.8034C17.0298 19.2336 16.7179 20.5282 16.0941 21.6871C15.4953 22.8214 14.6594 23.7215 13.5864 24.3872C12.5384 25.053 11.3407 25.3859 9.99332 25.3859Z");
    			attr_dev(path0, "fill", "white");
    			add_location(path0, file$4, 7, 2, 116);
    			attr_dev(path1, "d", "M10.143 28.16C12.0394 28.16 13.7237 27.7162 15.1958 26.8285C16.693 25.9161 17.8657 24.6832 18.7141 23.1296C19.5874 21.5515 20.0241 19.7761 20.0241 17.8034C20.0241 15.806 19.5874 14.0306 18.7141 12.4771C17.8657 10.9236 16.693 9.70297 15.1958 8.81525C13.7237 7.90288 12.0394 7.44669 10.143 7.44669C8.57105 7.44669 7.16125 7.75493 5.91365 8.3714C4.66604 8.98786 3.63053 9.82626 2.80711 10.8866V0.160034H0V27.7162H2.80711V24.4982C3.55567 25.6572 4.57871 26.5572 5.87622 27.1983C7.17373 27.8395 8.596 28.16 10.143 28.16ZM9.99332 25.3859C8.6459 25.3859 7.42325 25.053 6.32536 24.3872C5.25242 23.7215 4.39157 22.8214 3.74281 21.6871C3.11901 20.5282 2.80711 19.2336 2.80711 17.8034C2.80711 16.3732 3.11901 15.0909 3.74281 13.9566C4.39157 12.7976 5.25242 11.8853 6.32536 11.2195C7.42325 10.5537 8.6459 10.2208 9.99332 10.2208C11.3407 10.2208 12.5384 10.5537 13.5864 11.2195C14.6594 11.8853 15.4953 12.7853 16.0941 13.9196C16.7179 15.0539 17.0298 16.3485 17.0298 17.8034C17.0298 19.2336 16.7179 20.5282 16.0941 21.6871C15.4953 22.8214 14.6594 23.7215 13.5864 24.3872C12.5384 25.053 11.3407 25.3859 9.99332 25.3859Z");
    			attr_dev(path1, "fill", "url(#paint0_linear_927:3492)");
    			attr_dev(path1, "fill-opacity", "0.75");
    			add_location(path1, file$4, 11, 2, 1263);
    			attr_dev(path2, "d", "M24.2157 27.7162H27.0228V0.160034H24.2157V27.7162Z");
    			attr_dev(path2, "fill", "white");
    			add_location(path2, file$4, 16, 2, 2458);
    			attr_dev(path3, "d", "M24.2157 27.7162H27.0228V0.160034H24.2157V27.7162Z");
    			attr_dev(path3, "fill", "url(#paint1_linear_927:3492)");
    			attr_dev(path3, "fill-opacity", "0.75");
    			add_location(path3, file$4, 17, 2, 2538);
    			attr_dev(path4, "d", "M41.4145 28.16C43.2859 28.16 44.9827 27.7162 46.5048 26.8285C48.0518 25.9407 49.2869 24.7201 50.2102 23.1666C51.1334 21.5885 51.595 19.7884 51.595 17.7664C51.595 15.769 51.1459 13.9936 50.2476 12.4401C49.3743 10.8866 48.1641 9.66598 46.6171 8.77826C45.095 7.89055 43.3608 7.44669 41.4145 7.44669C39.4683 7.44669 37.7216 7.90288 36.1746 8.81525C34.6525 9.70297 33.4423 10.9236 32.5441 12.4771C31.6458 14.0306 31.1967 15.7937 31.1967 17.7664C31.1967 19.7637 31.6458 21.5515 32.5441 23.1296C33.4673 24.6832 34.7024 25.9161 36.2495 26.8285C37.7965 27.7162 39.5182 28.16 41.4145 28.16ZM41.4145 25.3859C40.0671 25.3859 38.8445 25.053 37.7466 24.3872C36.6736 23.7215 35.8128 22.8091 35.164 21.6501C34.5153 20.4912 34.1909 19.1966 34.1909 17.7664C34.1909 16.3362 34.5153 15.0539 35.164 13.9196C35.8128 12.7853 36.6736 11.8853 37.7466 11.2195C38.8445 10.5537 40.0671 10.2208 41.4145 10.2208C42.762 10.2208 43.9721 10.5537 45.0451 11.2195C46.143 11.8853 47.0038 12.7853 47.6276 13.9196C48.2764 15.0539 48.6007 16.3362 48.6007 17.7664C48.6007 19.1966 48.2764 20.4912 47.6276 21.6501C47.0038 22.8091 46.143 23.7215 45.0451 24.3872C43.9721 25.053 42.762 25.3859 41.4145 25.3859Z");
    			attr_dev(path4, "fill", "white");
    			add_location(path4, file$4, 22, 2, 2679);
    			attr_dev(path5, "d", "M41.4145 28.16C43.2859 28.16 44.9827 27.7162 46.5048 26.8285C48.0518 25.9407 49.2869 24.7201 50.2102 23.1666C51.1334 21.5885 51.595 19.7884 51.595 17.7664C51.595 15.769 51.1459 13.9936 50.2476 12.4401C49.3743 10.8866 48.1641 9.66598 46.6171 8.77826C45.095 7.89055 43.3608 7.44669 41.4145 7.44669C39.4683 7.44669 37.7216 7.90288 36.1746 8.81525C34.6525 9.70297 33.4423 10.9236 32.5441 12.4771C31.6458 14.0306 31.1967 15.7937 31.1967 17.7664C31.1967 19.7637 31.6458 21.5515 32.5441 23.1296C33.4673 24.6832 34.7024 25.9161 36.2495 26.8285C37.7965 27.7162 39.5182 28.16 41.4145 28.16ZM41.4145 25.3859C40.0671 25.3859 38.8445 25.053 37.7466 24.3872C36.6736 23.7215 35.8128 22.8091 35.164 21.6501C34.5153 20.4912 34.1909 19.1966 34.1909 17.7664C34.1909 16.3362 34.5153 15.0539 35.164 13.9196C35.8128 12.7853 36.6736 11.8853 37.7466 11.2195C38.8445 10.5537 40.0671 10.2208 41.4145 10.2208C42.762 10.2208 43.9721 10.5537 45.0451 11.2195C46.143 11.8853 47.0038 12.7853 47.6276 13.9196C48.2764 15.0539 48.6007 16.3362 48.6007 17.7664C48.6007 19.1966 48.2764 20.4912 47.6276 21.6501C47.0038 22.8091 46.143 23.7215 45.0451 24.3872C43.9721 25.053 42.762 25.3859 41.4145 25.3859Z");
    			attr_dev(path5, "fill", "url(#paint2_linear_927:3492)");
    			attr_dev(path5, "fill-opacity", "0.75");
    			add_location(path5, file$4, 26, 2, 3887);
    			attr_dev(path6, "d", "M52.5959 27.7162H56.0767L61.3167 20.1706L66.5566 27.7162H70L63.0009 17.8034L70 7.89055H66.5566L61.3167 15.4361L56.0767 7.89055H52.6333L59.6324 17.8034L52.5959 27.7162Z");
    			attr_dev(path6, "fill", "white");
    			add_location(path6, file$4, 31, 2, 5143);
    			attr_dev(path7, "d", "M52.5959 27.7162H56.0767L61.3167 20.1706L66.5566 27.7162H70L63.0009 17.8034L70 7.89055H66.5566L61.3167 15.4361L56.0767 7.89055H52.6333L59.6324 17.8034L52.5959 27.7162Z");
    			attr_dev(path7, "fill", "url(#paint3_linear_927:3492)");
    			attr_dev(path7, "fill-opacity", "0.75");
    			add_location(path7, file$4, 35, 2, 5353);
    			attr_dev(stop0, "stop-color", "#A2FACF");
    			add_location(stop0, file$4, 49, 6, 5811);
    			attr_dev(stop1, "offset", "1");
    			attr_dev(stop1, "stop-color", "#64ACFF");
    			add_location(stop1, file$4, 50, 6, 5848);
    			attr_dev(linearGradient0, "id", "paint0_linear_927:3492");
    			attr_dev(linearGradient0, "x1", "-2.66765e-08");
    			attr_dev(linearGradient0, "y1", "3.66003");
    			attr_dev(linearGradient0, "x2", "69.8689");
    			attr_dev(linearGradient0, "y2", "4.13563");
    			attr_dev(linearGradient0, "gradientUnits", "userSpaceOnUse");
    			add_location(linearGradient0, file$4, 41, 4, 5623);
    			attr_dev(stop2, "stop-color", "#A2FACF");
    			add_location(stop2, file$4, 60, 6, 6105);
    			attr_dev(stop3, "offset", "1");
    			attr_dev(stop3, "stop-color", "#64ACFF");
    			add_location(stop3, file$4, 61, 6, 6142);
    			attr_dev(linearGradient1, "id", "paint1_linear_927:3492");
    			attr_dev(linearGradient1, "x1", "-2.66765e-08");
    			attr_dev(linearGradient1, "y1", "3.66003");
    			attr_dev(linearGradient1, "x2", "69.8689");
    			attr_dev(linearGradient1, "y2", "4.13563");
    			attr_dev(linearGradient1, "gradientUnits", "userSpaceOnUse");
    			add_location(linearGradient1, file$4, 52, 4, 5917);
    			attr_dev(stop4, "stop-color", "#A2FACF");
    			add_location(stop4, file$4, 71, 6, 6399);
    			attr_dev(stop5, "offset", "1");
    			attr_dev(stop5, "stop-color", "#64ACFF");
    			add_location(stop5, file$4, 72, 6, 6436);
    			attr_dev(linearGradient2, "id", "paint2_linear_927:3492");
    			attr_dev(linearGradient2, "x1", "-2.66765e-08");
    			attr_dev(linearGradient2, "y1", "3.66003");
    			attr_dev(linearGradient2, "x2", "69.8689");
    			attr_dev(linearGradient2, "y2", "4.13563");
    			attr_dev(linearGradient2, "gradientUnits", "userSpaceOnUse");
    			add_location(linearGradient2, file$4, 63, 4, 6211);
    			attr_dev(stop6, "stop-color", "#A2FACF");
    			add_location(stop6, file$4, 82, 6, 6693);
    			attr_dev(stop7, "offset", "1");
    			attr_dev(stop7, "stop-color", "#64ACFF");
    			add_location(stop7, file$4, 83, 6, 6730);
    			attr_dev(linearGradient3, "id", "paint3_linear_927:3492");
    			attr_dev(linearGradient3, "x1", "-2.66765e-08");
    			attr_dev(linearGradient3, "y1", "3.66003");
    			attr_dev(linearGradient3, "x2", "69.8689");
    			attr_dev(linearGradient3, "y2", "4.13563");
    			attr_dev(linearGradient3, "gradientUnits", "userSpaceOnUse");
    			add_location(linearGradient3, file$4, 74, 4, 6505);
    			add_location(defs, file$4, 40, 2, 5611);
    			attr_dev(svg, "width", "70");
    			attr_dev(svg, "height", "29");
    			attr_dev(svg, "viewBox", "0 0 70 29");
    			attr_dev(svg, "fill", "none");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "class", "svelte-15iv2p3");
    			add_location(svg, file$4, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path0);
    			append_dev(svg, path1);
    			append_dev(svg, path2);
    			append_dev(svg, path3);
    			append_dev(svg, path4);
    			append_dev(svg, path5);
    			append_dev(svg, path6);
    			append_dev(svg, path7);
    			append_dev(svg, defs);
    			append_dev(defs, linearGradient0);
    			append_dev(linearGradient0, stop0);
    			append_dev(linearGradient0, stop1);
    			append_dev(defs, linearGradient1);
    			append_dev(linearGradient1, stop2);
    			append_dev(linearGradient1, stop3);
    			append_dev(defs, linearGradient2);
    			append_dev(linearGradient2, stop4);
    			append_dev(linearGradient2, stop5);
    			append_dev(defs, linearGradient3);
    			append_dev(linearGradient3, stop6);
    			append_dev(linearGradient3, stop7);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
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

    function instance$4($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Spinner', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Spinner> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Spinner extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Spinner",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* webviews\components\UI\Button.svelte generated by Svelte v3.43.1 */

    const file$3 = "webviews\\components\\UI\\Button.svelte";

    function create_fragment$3(ctx) {
    	let button;
    	let t;
    	let button_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(/*text*/ ctx[2]);
    			attr_dev(button, "class", button_class_value = "" + (null_to_empty(/*styleClasses*/ ctx[0]) + " svelte-l46wb1"));
    			attr_dev(button, "type", /*type*/ ctx[1]);
    			add_location(button, file$3, 6, 0, 123);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*text*/ 4) set_data_dev(t, /*text*/ ctx[2]);

    			if (dirty & /*styleClasses*/ 1 && button_class_value !== (button_class_value = "" + (null_to_empty(/*styleClasses*/ ctx[0]) + " svelte-l46wb1"))) {
    				attr_dev(button, "class", button_class_value);
    			}

    			if (dirty & /*type*/ 2) {
    				attr_dev(button, "type", /*type*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
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

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Button', slots, []);
    	let { styleClasses = "" } = $$props;
    	let { type = "button" } = $$props;
    	let { text = "Button Text" } = $$props;
    	const writable_props = ['styleClasses', 'type', 'text'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Button> was created with unknown prop '${key}'`);
    	});

    	function click_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ('styleClasses' in $$props) $$invalidate(0, styleClasses = $$props.styleClasses);
    		if ('type' in $$props) $$invalidate(1, type = $$props.type);
    		if ('text' in $$props) $$invalidate(2, text = $$props.text);
    	};

    	$$self.$capture_state = () => ({ styleClasses, type, text });

    	$$self.$inject_state = $$props => {
    		if ('styleClasses' in $$props) $$invalidate(0, styleClasses = $$props.styleClasses);
    		if ('type' in $$props) $$invalidate(1, type = $$props.type);
    		if ('text' in $$props) $$invalidate(2, text = $$props.text);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [styleClasses, type, text, click_handler];
    }

    class Button extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { styleClasses: 0, type: 1, text: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Button",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get styleClasses() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set styleClasses(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get type() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get text() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set text(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* webviews\components\UI\Input.svelte generated by Svelte v3.43.1 */

    const file$2 = "webviews\\components\\UI\\Input.svelte";

    // (21:2) {#if prefixIcon}
    function create_if_block_2(ctx) {
    	let html_tag;
    	let raw_value = /*icons*/ ctx[7][/*prefixIcon*/ ctx[6]].icon + "";
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
    		p: function update(ctx, dirty) {
    			if (dirty & /*prefixIcon*/ 64 && raw_value !== (raw_value = /*icons*/ ctx[7][/*prefixIcon*/ ctx[6]].icon + "")) html_tag.p(raw_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(21:2) {#if prefixIcon}",
    		ctx
    	});

    	return block;
    }

    // (24:2) {#if type !== "checkbox"}
    function create_if_block_1$1(ctx) {
    	let label_1;
    	let t;
    	let label_1_for_value;

    	const block = {
    		c: function create() {
    			label_1 = element("label");
    			t = text(/*label*/ ctx[1]);
    			attr_dev(label_1, "class", "bold svelte-1yzf32u");
    			attr_dev(label_1, "for", label_1_for_value = /*label*/ ctx[1].toLowerCase());
    			add_location(label_1, file$2, 24, 4, 1872);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label_1, anchor);
    			append_dev(label_1, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*label*/ 2) set_data_dev(t, /*label*/ ctx[1]);

    			if (dirty & /*label*/ 2 && label_1_for_value !== (label_1_for_value = /*label*/ ctx[1].toLowerCase())) {
    				attr_dev(label_1, "for", label_1_for_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label_1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(24:2) {#if type !== \\\"checkbox\\\"}",
    		ctx
    	});

    	return block;
    }

    // (38:2) {#if type === "checkbox"}
    function create_if_block$2(ctx) {
    	let label_1;
    	let t;
    	let label_1_for_value;

    	const block = {
    		c: function create() {
    			label_1 = element("label");
    			t = text(/*label*/ ctx[1]);
    			attr_dev(label_1, "for", label_1_for_value = /*label*/ ctx[1].toLowerCase());
    			attr_dev(label_1, "class", "svelte-1yzf32u");
    			add_location(label_1, file$2, 38, 4, 2221);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label_1, anchor);
    			append_dev(label_1, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*label*/ 2) set_data_dev(t, /*label*/ ctx[1]);

    			if (dirty & /*label*/ 2 && label_1_for_value !== (label_1_for_value = /*label*/ ctx[1].toLowerCase())) {
    				attr_dev(label_1, "for", label_1_for_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label_1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(38:2) {#if type === \\\"checkbox\\\"}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let input;
    	let input_id_value;
    	let input_class_value;
    	let input_name_value;
    	let t2;
    	let div_class_value;
    	let mounted;
    	let dispose;
    	let if_block0 = /*prefixIcon*/ ctx[6] && create_if_block_2(ctx);
    	let if_block1 = /*type*/ ctx[2] !== "checkbox" && create_if_block_1$1(ctx);
    	let if_block2 = /*type*/ ctx[2] === "checkbox" && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			if (if_block2) if_block2.c();
    			attr_dev(input, "id", input_id_value = /*label*/ ctx[1].toLowerCase());
    			attr_dev(input, "class", input_class_value = "" + (null_to_empty(/*prefixIcon*/ ctx[6] ? "prefix-padding" : "") + " svelte-1yzf32u"));
    			attr_dev(input, "type", /*type*/ ctx[2]);
    			attr_dev(input, "placeholder", /*placeholder*/ ctx[3]);
    			attr_dev(input, "name", input_name_value = /*label*/ ctx[1].toLowerCase());
    			input.required = /*required*/ ctx[4];
    			add_location(input, file$2, 26, 2, 1946);
    			attr_dev(div, "class", div_class_value = "" + (null_to_empty(`form-control ${/*styleClasses*/ ctx[5]}`) + " svelte-1yzf32u"));
    			add_location(div, file$2, 19, 0, 1728);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block0) if_block0.m(div, null);
    			append_dev(div, t0);
    			if (if_block1) if_block1.m(div, null);
    			append_dev(div, t1);
    			append_dev(div, input);
    			append_dev(div, t2);
    			if (if_block2) if_block2.m(div, null);

    			if (!mounted) {
    				dispose = listen_dev(input, "input", /*input_handler*/ ctx[8], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*prefixIcon*/ ctx[6]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					if_block0.m(div, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*type*/ ctx[2] !== "checkbox") {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1$1(ctx);
    					if_block1.c();
    					if_block1.m(div, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*label*/ 2 && input_id_value !== (input_id_value = /*label*/ ctx[1].toLowerCase())) {
    				attr_dev(input, "id", input_id_value);
    			}

    			if (dirty & /*prefixIcon*/ 64 && input_class_value !== (input_class_value = "" + (null_to_empty(/*prefixIcon*/ ctx[6] ? "prefix-padding" : "") + " svelte-1yzf32u"))) {
    				attr_dev(input, "class", input_class_value);
    			}

    			if (dirty & /*type*/ 4) {
    				attr_dev(input, "type", /*type*/ ctx[2]);
    			}

    			if (dirty & /*placeholder*/ 8) {
    				attr_dev(input, "placeholder", /*placeholder*/ ctx[3]);
    			}

    			if (dirty & /*label*/ 2 && input_name_value !== (input_name_value = /*label*/ ctx[1].toLowerCase())) {
    				attr_dev(input, "name", input_name_value);
    			}

    			if (dirty & /*required*/ 16) {
    				prop_dev(input, "required", /*required*/ ctx[4]);
    			}

    			if (/*type*/ ctx[2] === "checkbox") {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block$2(ctx);
    					if_block2.c();
    					if_block2.m(div, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (dirty & /*styleClasses*/ 32 && div_class_value !== (div_class_value = "" + (null_to_empty(`form-control ${/*styleClasses*/ ctx[5]}`) + " svelte-1yzf32u"))) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			mounted = false;
    			dispose();
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
    	validate_slots('Input', slots, []);
    	let { label = "" } = $$props;
    	let { type = "text" } = $$props;
    	let { value = "" } = $$props;
    	let { placeholder = label } = $$props;
    	let { required = false } = $$props;
    	let { styleClasses = "" } = $$props;
    	let { prefixIcon = null } = $$props;

    	const icons = {
    		mail: {
    			icon: `<svg class="prefix-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <style> .prefix-icon{ position: absolute; top: 43px; left: 16px; pointer-events: none; } </style>
        <path d="M16.5625 3.125H3.4375C2.85753 3.12562 2.30149 3.35629 1.89139 3.76639C1.48129 4.17649 1.25062 4.73253 1.25 5.3125V14.6875C1.25062 15.2675 1.48129 15.8235 1.89139 16.2336C2.30149 16.6437 2.85753 16.8744 3.4375 16.875H16.5625C17.1425 16.8744 17.6985 16.6437 18.1086 16.2336C18.5187 15.8235 18.7494 15.2675 18.75 14.6875V5.3125C18.7494 4.73253 18.5187 4.17649 18.1086 3.76639C17.6985 3.35629 17.1425 3.12562 16.5625 3.125ZM16.0086 6.74336L10.3836 11.1184C10.2739 11.2036 10.1389 11.2499 10 11.2499C9.86107 11.2499 9.72609 11.2036 9.61641 11.1184L3.99141 6.74336C3.92532 6.69345 3.86981 6.63091 3.8281 6.55936C3.78639 6.48781 3.75932 6.40869 3.74846 6.32659C3.73759 6.24449 3.74315 6.16104 3.76482 6.08111C3.78648 6.00118 3.82381 5.92635 3.87465 5.86097C3.92548 5.79559 3.9888 5.74096 4.06093 5.70027C4.13306 5.65957 4.21255 5.63362 4.2948 5.62391C4.37704 5.6142 4.4604 5.62094 4.54002 5.64372C4.61964 5.66651 4.69394 5.70489 4.75859 5.75664L10 9.8332L15.2414 5.75664C15.3725 5.65766 15.5372 5.61425 15.7 5.6358C15.8629 5.65734 16.0107 5.74211 16.1115 5.87177C16.2123 6.00142 16.258 6.16555 16.2387 6.32866C16.2195 6.49176 16.1368 6.64073 16.0086 6.74336Z" fill="#D4D4D8"/>
        </svg>`
    		}
    	};

    	const writable_props = [
    		'label',
    		'type',
    		'value',
    		'placeholder',
    		'required',
    		'styleClasses',
    		'prefixIcon'
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Input> was created with unknown prop '${key}'`);
    	});

    	const input_handler = event => {
    		$$invalidate(0, value = event.target.value);
    	};

    	$$self.$$set = $$props => {
    		if ('label' in $$props) $$invalidate(1, label = $$props.label);
    		if ('type' in $$props) $$invalidate(2, type = $$props.type);
    		if ('value' in $$props) $$invalidate(0, value = $$props.value);
    		if ('placeholder' in $$props) $$invalidate(3, placeholder = $$props.placeholder);
    		if ('required' in $$props) $$invalidate(4, required = $$props.required);
    		if ('styleClasses' in $$props) $$invalidate(5, styleClasses = $$props.styleClasses);
    		if ('prefixIcon' in $$props) $$invalidate(6, prefixIcon = $$props.prefixIcon);
    	};

    	$$self.$capture_state = () => ({
    		label,
    		type,
    		value,
    		placeholder,
    		required,
    		styleClasses,
    		prefixIcon,
    		icons
    	});

    	$$self.$inject_state = $$props => {
    		if ('label' in $$props) $$invalidate(1, label = $$props.label);
    		if ('type' in $$props) $$invalidate(2, type = $$props.type);
    		if ('value' in $$props) $$invalidate(0, value = $$props.value);
    		if ('placeholder' in $$props) $$invalidate(3, placeholder = $$props.placeholder);
    		if ('required' in $$props) $$invalidate(4, required = $$props.required);
    		if ('styleClasses' in $$props) $$invalidate(5, styleClasses = $$props.styleClasses);
    		if ('prefixIcon' in $$props) $$invalidate(6, prefixIcon = $$props.prefixIcon);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		value,
    		label,
    		type,
    		placeholder,
    		required,
    		styleClasses,
    		prefixIcon,
    		icons,
    		input_handler
    	];
    }

    class Input extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			label: 1,
    			type: 2,
    			value: 0,
    			placeholder: 3,
    			required: 4,
    			styleClasses: 5,
    			prefixIcon: 6
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Input",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get label() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get type() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get placeholder() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set placeholder(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get required() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set required(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get styleClasses() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set styleClasses(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get prefixIcon() {
    		throw new Error("<Input>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set prefixIcon(value) {
    		throw new Error("<Input>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* webviews\components\UI\PasswordInput.svelte generated by Svelte v3.43.1 */

    const file$1 = "webviews\\components\\UI\\PasswordInput.svelte";

    // (25:2) {#if prefixIcon}
    function create_if_block_1(ctx) {
    	let html_tag;
    	let raw_value = /*icons*/ ctx[7][/*prefixIcon*/ ctx[5]].icon + "";
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
    		p: function update(ctx, dirty) {
    			if (dirty & /*prefixIcon*/ 32 && raw_value !== (raw_value = /*icons*/ ctx[7][/*prefixIcon*/ ctx[5]].icon + "")) html_tag.p(raw_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(25:2) {#if prefixIcon}",
    		ctx
    	});

    	return block;
    }

    // (69:4) {:else}
    function create_else_block(ctx) {
    	let svg;
    	let style;
    	let t;
    	let path0;
    	let line;
    	let path1;
    	let path2;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			style = svg_element("style");
    			t = text(".togglePasswordIcon:hover {\r\n            stroke: #d1d5db;\r\n          }\r\n        ");
    			path0 = svg_element("path");
    			line = svg_element("line");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			add_location(style, file$1, 81, 8, 3143);
    			attr_dev(path0, "stroke", "none");
    			attr_dev(path0, "d", "M0 0h24v24H0z");
    			attr_dev(path0, "fill", "none");
    			add_location(path0, file$1, 87, 8, 3262);
    			attr_dev(line, "x1", "3");
    			attr_dev(line, "y1", "3");
    			attr_dev(line, "x2", "21");
    			attr_dev(line, "y2", "21");
    			add_location(line, file$1, 88, 8, 3324);
    			attr_dev(path1, "d", "M10.584 10.587a2 2 0 0 0 2.828 2.83");
    			add_location(path1, file$1, 89, 8, 3372);
    			attr_dev(path2, "d", "M9.363 5.365a9.466 9.466 0 0 1 2.637 -.365c4 0 7.333 2.333 10 7c-.778 1.361 -1.612 2.524 -2.503 3.488m-2.14 1.861c-1.631 1.1 -3.415 1.651 -5.357 1.651c-4 0 -7.333 -2.333 -10 -7c1.369 -2.395 2.913 -4.175 4.632 -5.341");
    			add_location(path2, file$1, 90, 8, 3430);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "class", "icon icon-tabler icon-tabler-eye-off togglePasswordIcon");
    			attr_dev(svg, "width", "24");
    			attr_dev(svg, "height", "24");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			attr_dev(svg, "stroke-width", "1.5");
    			attr_dev(svg, "stroke", "#ffffff");
    			attr_dev(svg, "fill", "none");
    			attr_dev(svg, "stroke-linecap", "round");
    			attr_dev(svg, "stroke-linejoin", "round");
    			add_location(svg, file$1, 69, 6, 2793);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, style);
    			append_dev(style, t);
    			append_dev(svg, path0);
    			append_dev(svg, line);
    			append_dev(svg, path1);
    			append_dev(svg, path2);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(69:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (45:4) {#if passwordType === "text"}
    function create_if_block$1(ctx) {
    	let svg;
    	let style;
    	let t;
    	let path0;
    	let circle;
    	let path1;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			style = svg_element("style");
    			t = text(".togglePasswordIcon:hover {\r\n            stroke: #d1d5db;\r\n          }\r\n        ");
    			path0 = svg_element("path");
    			circle = svg_element("circle");
    			path1 = svg_element("path");
    			add_location(style, file$1, 57, 8, 2412);
    			attr_dev(path0, "stroke", "none");
    			attr_dev(path0, "d", "M0 0h24v24H0z");
    			attr_dev(path0, "fill", "none");
    			add_location(path0, file$1, 62, 8, 2529);
    			attr_dev(circle, "cx", "12");
    			attr_dev(circle, "cy", "12");
    			attr_dev(circle, "r", "2");
    			add_location(circle, file$1, 63, 8, 2591);
    			attr_dev(path1, "d", "M22 12c-2.667 4.667 -6 7 -10 7s-7.333 -2.333 -10 -7c2.667 -4.667 6 -7 10 -7s7.333 2.333 10 7");
    			add_location(path1, file$1, 64, 8, 2633);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "class", "icon icon-tabler icon-tabler-eye togglePasswordIcon");
    			attr_dev(svg, "width", "24");
    			attr_dev(svg, "height", "24");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			attr_dev(svg, "stroke-width", "1.5");
    			attr_dev(svg, "stroke", "#ffffff");
    			attr_dev(svg, "fill", "none");
    			attr_dev(svg, "stroke-linecap", "round");
    			attr_dev(svg, "stroke-linejoin", "round");
    			add_location(svg, file$1, 45, 6, 2066);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, style);
    			append_dev(style, t);
    			append_dev(svg, path0);
    			append_dev(svg, circle);
    			append_dev(svg, path1);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(45:4) {#if passwordType === \\\"text\\\"}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let t0;
    	let label_1;
    	let t1;
    	let label_1_for_value;
    	let t2;
    	let input;
    	let input_id_value;
    	let input_class_value;
    	let input_name_value;
    	let t3;
    	let i;
    	let i_class_value;
    	let div_class_value;
    	let mounted;
    	let dispose;
    	let if_block0 = /*prefixIcon*/ ctx[5] && create_if_block_1(ctx);

    	function select_block_type(ctx, dirty) {
    		if (/*passwordType*/ ctx[6] === "text") return create_if_block$1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block1 = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			label_1 = element("label");
    			t1 = text(/*label*/ ctx[1]);
    			t2 = space();
    			input = element("input");
    			t3 = space();
    			i = element("i");
    			if_block1.c();
    			attr_dev(label_1, "for", label_1_for_value = /*label*/ ctx[1].toLowerCase());
    			attr_dev(label_1, "class", "svelte-qz9mb7");
    			add_location(label_1, file$1, 27, 2, 1585);
    			attr_dev(input, "id", input_id_value = /*label*/ ctx[1].toLowerCase());
    			attr_dev(input, "class", input_class_value = "" + (null_to_empty(/*prefixIcon*/ ctx[5] ? "prefix-padding" : "") + " svelte-qz9mb7"));
    			attr_dev(input, "type", /*passwordType*/ ctx[6]);
    			attr_dev(input, "placeholder", /*placeholder*/ ctx[2]);
    			attr_dev(input, "name", input_name_value = /*label*/ ctx[1].toLowerCase());
    			input.required = /*required*/ ctx[3];
    			add_location(input, file$1, 28, 2, 1637);
    			attr_dev(i, "class", i_class_value = "" + (null_to_empty("togglePasswordContainer " + (/*passwordType*/ ctx[6] === "text" ? "active" : "")) + " svelte-qz9mb7"));
    			add_location(i, file$1, 39, 2, 1894);
    			attr_dev(div, "class", div_class_value = "" + (null_to_empty(`form-control ${/*styleClasses*/ ctx[4]}`) + " svelte-qz9mb7"));
    			add_location(div, file$1, 23, 0, 1472);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block0) if_block0.m(div, null);
    			append_dev(div, t0);
    			append_dev(div, label_1);
    			append_dev(label_1, t1);
    			append_dev(div, t2);
    			append_dev(div, input);
    			append_dev(div, t3);
    			append_dev(div, i);
    			if_block1.m(i, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_handler*/ ctx[9], false, false, false),
    					listen_dev(i, "click", /*togglePassword*/ ctx[8], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*prefixIcon*/ ctx[5]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(div, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*label*/ 2) set_data_dev(t1, /*label*/ ctx[1]);

    			if (dirty & /*label*/ 2 && label_1_for_value !== (label_1_for_value = /*label*/ ctx[1].toLowerCase())) {
    				attr_dev(label_1, "for", label_1_for_value);
    			}

    			if (dirty & /*label*/ 2 && input_id_value !== (input_id_value = /*label*/ ctx[1].toLowerCase())) {
    				attr_dev(input, "id", input_id_value);
    			}

    			if (dirty & /*prefixIcon*/ 32 && input_class_value !== (input_class_value = "" + (null_to_empty(/*prefixIcon*/ ctx[5] ? "prefix-padding" : "") + " svelte-qz9mb7"))) {
    				attr_dev(input, "class", input_class_value);
    			}

    			if (dirty & /*passwordType*/ 64) {
    				attr_dev(input, "type", /*passwordType*/ ctx[6]);
    			}

    			if (dirty & /*placeholder*/ 4) {
    				attr_dev(input, "placeholder", /*placeholder*/ ctx[2]);
    			}

    			if (dirty & /*label*/ 2 && input_name_value !== (input_name_value = /*label*/ ctx[1].toLowerCase())) {
    				attr_dev(input, "name", input_name_value);
    			}

    			if (dirty & /*required*/ 8) {
    				prop_dev(input, "required", /*required*/ ctx[3]);
    			}

    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block1.d(1);
    				if_block1 = current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(i, null);
    				}
    			}

    			if (dirty & /*passwordType*/ 64 && i_class_value !== (i_class_value = "" + (null_to_empty("togglePasswordContainer " + (/*passwordType*/ ctx[6] === "text" ? "active" : "")) + " svelte-qz9mb7"))) {
    				attr_dev(i, "class", i_class_value);
    			}

    			if (dirty & /*styleClasses*/ 16 && div_class_value !== (div_class_value = "" + (null_to_empty(`form-control ${/*styleClasses*/ ctx[4]}`) + " svelte-qz9mb7"))) {
    				attr_dev(div, "class", div_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block0) if_block0.d();
    			if_block1.d();
    			mounted = false;
    			run_all(dispose);
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
    	validate_slots('PasswordInput', slots, []);
    	let { label = "" } = $$props;
    	let { value = "" } = $$props;
    	let { placeholder = label } = $$props;
    	let { required = false } = $$props;
    	let { styleClasses = "" } = $$props;
    	let { prefixIcon = null } = $$props;
    	let passwordType = "password";

    	const icons = {
    		lock: {
    			icon: `<svg class="prefix-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <style> .prefix-icon{ position: absolute; top: 43px; left: 16px; pointer-events: none; } </style>
        <path d="M14.375 7.5H13.75V4.375C13.75 3.38044 13.3549 2.42661 12.6517 1.72335C11.9484 1.02009 10.9946 0.625 10 0.625C9.00544 0.625 8.05161 1.02009 7.34835 1.72335C6.64509 2.42661 6.25 3.38044 6.25 4.375V7.5H5.625C4.96218 7.50072 4.32672 7.76435 3.85803 8.23303C3.38935 8.70172 3.12572 9.33718 3.125 10V16.875C3.12572 17.5378 3.38935 18.1733 3.85803 18.642C4.32672 19.1107 4.96218 19.3743 5.625 19.375H14.375C15.0378 19.3743 15.6733 19.1107 16.142 18.642C16.6107 18.1733 16.8743 17.5378 16.875 16.875V10C16.8743 9.33718 16.6107 8.70172 16.142 8.23303C15.6733 7.76435 15.0378 7.50072 14.375 7.5ZM12.5 7.5H7.5V4.375C7.5 3.71196 7.76339 3.07607 8.23223 2.60723C8.70107 2.13839 9.33696 1.875 10 1.875C10.663 1.875 11.2989 2.13839 11.7678 2.60723C12.2366 3.07607 12.5 3.71196 12.5 4.375V7.5Z" fill="#D4D4D8"/>
        </svg>`
    		}
    	};

    	const togglePassword = () => {
    		$$invalidate(6, passwordType = passwordType === "password" ? "text" : "password");
    	};

    	const writable_props = ['label', 'value', 'placeholder', 'required', 'styleClasses', 'prefixIcon'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<PasswordInput> was created with unknown prop '${key}'`);
    	});

    	const input_handler = event => {
    		$$invalidate(0, value = event.target.value);
    	};

    	$$self.$$set = $$props => {
    		if ('label' in $$props) $$invalidate(1, label = $$props.label);
    		if ('value' in $$props) $$invalidate(0, value = $$props.value);
    		if ('placeholder' in $$props) $$invalidate(2, placeholder = $$props.placeholder);
    		if ('required' in $$props) $$invalidate(3, required = $$props.required);
    		if ('styleClasses' in $$props) $$invalidate(4, styleClasses = $$props.styleClasses);
    		if ('prefixIcon' in $$props) $$invalidate(5, prefixIcon = $$props.prefixIcon);
    	};

    	$$self.$capture_state = () => ({
    		label,
    		value,
    		placeholder,
    		required,
    		styleClasses,
    		prefixIcon,
    		passwordType,
    		icons,
    		togglePassword
    	});

    	$$self.$inject_state = $$props => {
    		if ('label' in $$props) $$invalidate(1, label = $$props.label);
    		if ('value' in $$props) $$invalidate(0, value = $$props.value);
    		if ('placeholder' in $$props) $$invalidate(2, placeholder = $$props.placeholder);
    		if ('required' in $$props) $$invalidate(3, required = $$props.required);
    		if ('styleClasses' in $$props) $$invalidate(4, styleClasses = $$props.styleClasses);
    		if ('prefixIcon' in $$props) $$invalidate(5, prefixIcon = $$props.prefixIcon);
    		if ('passwordType' in $$props) $$invalidate(6, passwordType = $$props.passwordType);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		value,
    		label,
    		placeholder,
    		required,
    		styleClasses,
    		prefixIcon,
    		passwordType,
    		icons,
    		togglePassword,
    		input_handler
    	];
    }

    class PasswordInput extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			label: 1,
    			value: 0,
    			placeholder: 2,
    			required: 3,
    			styleClasses: 4,
    			prefixIcon: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PasswordInput",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get label() {
    		throw new Error("<PasswordInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<PasswordInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<PasswordInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<PasswordInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get placeholder() {
    		throw new Error("<PasswordInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set placeholder(value) {
    		throw new Error("<PasswordInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get required() {
    		throw new Error("<PasswordInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set required(value) {
    		throw new Error("<PasswordInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get styleClasses() {
    		throw new Error("<PasswordInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set styleClasses(value) {
    		throw new Error("<PasswordInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get prefixIcon() {
    		throw new Error("<PasswordInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set prefixIcon(value) {
    		throw new Error("<PasswordInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* webviews\components\Singin\SignIn.svelte generated by Svelte v3.43.1 */
    const file = "webviews\\components\\Singin\\SignIn.svelte";

    // (59:0) {#if isLoading}
    function create_if_block(ctx) {
    	let div;
    	let spinner;
    	let current;
    	spinner = new Spinner({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(spinner.$$.fragment);
    			attr_dev(div, "class", "loaderContainer svelte-m9p9uy");
    			add_location(div, file, 59, 2, 1905);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(spinner, div, null);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(spinner.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(spinner.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(spinner);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(59:0) {#if isLoading}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let t0;
    	let div6;
    	let div3;
    	let div2;
    	let div0;
    	let logo;
    	let t1;
    	let h2;
    	let t2;
    	let span;
    	let t4;
    	let form;
    	let input0;
    	let updating_value;
    	let t5;
    	let passwordinput;
    	let updating_value_1;
    	let t6;
    	let div1;
    	let input1;
    	let updating_value_2;
    	let t7;
    	let p0;
    	let t9;
    	let button0;
    	let t10;
    	let div5;
    	let div4;
    	let h1;
    	let t12;
    	let p1;
    	let html_tag;
    	let t13;
    	let t14;
    	let p2;
    	let html_tag_1;
    	let t15;
    	let t16;
    	let p3;
    	let html_tag_2;
    	let t17;
    	let t18;
    	let p4;
    	let html_tag_3;
    	let t19;
    	let t20;
    	let p5;
    	let html_tag_4;
    	let t21;
    	let t22;
    	let p6;
    	let html_tag_5;
    	let t23;
    	let t24;
    	let p7;
    	let html_tag_6;
    	let t25;
    	let t26;
    	let button1;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*isLoading*/ ctx[3] && create_if_block(ctx);
    	logo = new Logo({ $$inline: true });

    	function input0_value_binding(value) {
    		/*input0_value_binding*/ ctx[7](value);
    	}

    	let input0_props = {
    		prefixIcon: "mail",
    		styleClasses: "mb-2",
    		label: "Email",
    		type: "email",
    		required: true
    	};

    	if (/*email*/ ctx[0] !== void 0) {
    		input0_props.value = /*email*/ ctx[0];
    	}

    	input0 = new Input({ props: input0_props, $$inline: true });
    	binding_callbacks.push(() => bind(input0, 'value', input0_value_binding));

    	function passwordinput_value_binding(value) {
    		/*passwordinput_value_binding*/ ctx[8](value);
    	}

    	let passwordinput_props = {
    		prefixIcon: "lock",
    		styleClasses: "mb-2",
    		label: "Password",
    		required: true
    	};

    	if (/*password*/ ctx[1] !== void 0) {
    		passwordinput_props.value = /*password*/ ctx[1];
    	}

    	passwordinput = new PasswordInput({
    			props: passwordinput_props,
    			$$inline: true
    		});

    	binding_callbacks.push(() => bind(passwordinput, 'value', passwordinput_value_binding));

    	function input1_value_binding(value) {
    		/*input1_value_binding*/ ctx[9](value);
    	}

    	let input1_props = {
    		styleClasses: "flex-1",
    		label: "Remember",
    		type: "checkbox"
    	};

    	if (/*remember*/ ctx[2] !== void 0) {
    		input1_props.value = /*remember*/ ctx[2];
    	}

    	input1 = new Input({ props: input1_props, $$inline: true });
    	binding_callbacks.push(() => bind(input1, 'value', input1_value_binding));

    	button0 = new Button({
    			props: {
    				styleClasses: "button primary-button mb-3",
    				type: "submit",
    				text: "Login"
    			},
    			$$inline: true
    		});

    	button1 = new Button({
    			props: {
    				styleClasses: "button pro-button",
    				text: "Go pro"
    			},
    			$$inline: true
    		});

    	button1.$on("click", /*click_handler_1*/ ctx[11]);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			t0 = space();
    			div6 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			create_component(logo.$$.fragment);
    			t1 = space();
    			h2 = element("h2");
    			t2 = text("Already a Pro member?\r\n        ");
    			span = element("span");
    			span.textContent = "Login here";
    			t4 = space();
    			form = element("form");
    			create_component(input0.$$.fragment);
    			t5 = space();
    			create_component(passwordinput.$$.fragment);
    			t6 = space();
    			div1 = element("div");
    			create_component(input1.$$.fragment);
    			t7 = space();
    			p0 = element("p");
    			p0.textContent = "Forgot Password?";
    			t9 = space();
    			create_component(button0.$$.fragment);
    			t10 = space();
    			div5 = element("div");
    			div4 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Go pro and get access to 1000+ code blocks";
    			t12 = space();
    			p1 = element("p");
    			html_tag = new HtmlTag();
    			t13 = text("500+ Web Application components");
    			t14 = space();
    			p2 = element("p");
    			html_tag_1 = new HtmlTag();
    			t15 = text("250+ Marketing components");
    			t16 = space();
    			p3 = element("p");
    			html_tag_2 = new HtmlTag();
    			t17 = text("200+ Ecommerce components");
    			t18 = space();
    			p4 = element("p");
    			html_tag_3 = new HtmlTag();
    			t19 = text("React, Angular, & Vue support");
    			t20 = space();
    			p5 = element("p");
    			html_tag_4 = new HtmlTag();
    			t21 = text("Premium support");
    			t22 = space();
    			p6 = element("p");
    			html_tag_5 = new HtmlTag();
    			t23 = text("Lifetime access");
    			t24 = space();
    			p7 = element("p");
    			html_tag_6 = new HtmlTag();
    			t25 = text("Use on Unlimited Projects");
    			t26 = space();
    			create_component(button1.$$.fragment);
    			attr_dev(div0, "class", "logo svelte-m9p9uy");
    			add_location(div0, file, 66, 6, 2068);
    			attr_dev(span, "class", "header-secondary--link svelte-m9p9uy");
    			add_location(span, file, 71, 8, 2201);
    			attr_dev(h2, "class", "header-secondary mb-3 svelte-m9p9uy");
    			add_location(h2, file, 69, 6, 2126);
    			attr_dev(p0, "class", "link forgot-link svelte-m9p9uy");
    			add_location(p0, file, 143, 10, 9591);
    			attr_dev(div1, "class", "rememberBox mb-2 svelte-m9p9uy");
    			add_location(div1, file, 136, 8, 9388);
    			attr_dev(form, "class", "svelte-m9p9uy");
    			add_location(form, file, 119, 6, 8983);
    			attr_dev(div2, "class", "signInBox svelte-m9p9uy");
    			add_location(div2, file, 65, 4, 2037);
    			attr_dev(div3, "class", "sign-in-section flex-1 svelte-m9p9uy");
    			add_location(div3, file, 64, 2, 1995);
    			attr_dev(h1, "class", "header-primary mb-5 svelte-m9p9uy");
    			add_location(h1, file, 161, 6, 10048);
    			html_tag.a = t13;
    			attr_dev(p1, "class", "feature mb-2 svelte-m9p9uy");
    			add_location(p1, file, 164, 6, 10153);
    			html_tag_1.a = t15;
    			attr_dev(p2, "class", "feature mb-2 svelte-m9p9uy");
    			add_location(p2, file, 167, 6, 10256);
    			html_tag_2.a = t17;
    			attr_dev(p3, "class", "feature mb-2 svelte-m9p9uy");
    			add_location(p3, file, 168, 6, 10335);
    			html_tag_3.a = t19;
    			attr_dev(p4, "class", "feature mb-2 svelte-m9p9uy");
    			add_location(p4, file, 169, 6, 10414);
    			html_tag_4.a = t21;
    			attr_dev(p5, "class", "feature mb-2 svelte-m9p9uy");
    			add_location(p5, file, 172, 6, 10515);
    			html_tag_5.a = t23;
    			attr_dev(p6, "class", "feature mb-2 svelte-m9p9uy");
    			add_location(p6, file, 173, 6, 10584);
    			html_tag_6.a = t25;
    			attr_dev(p7, "class", "feature mb-5 svelte-m9p9uy");
    			add_location(p7, file, 174, 6, 10653);
    			attr_dev(div4, "class", "features-container svelte-m9p9uy");
    			add_location(div4, file, 160, 4, 10008);
    			attr_dev(div5, "class", "pro-features-section flex-1 svelte-m9p9uy");
    			add_location(div5, file, 159, 2, 9961);
    			attr_dev(div6, "class", "section svelte-m9p9uy");
    			add_location(div6, file, 63, 0, 1970);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			mount_component(logo, div0, null);
    			append_dev(div2, t1);
    			append_dev(div2, h2);
    			append_dev(h2, t2);
    			append_dev(h2, span);
    			append_dev(div2, t4);
    			append_dev(div2, form);
    			mount_component(input0, form, null);
    			append_dev(form, t5);
    			mount_component(passwordinput, form, null);
    			append_dev(form, t6);
    			append_dev(form, div1);
    			mount_component(input1, div1, null);
    			append_dev(div1, t7);
    			append_dev(div1, p0);
    			append_dev(form, t9);
    			mount_component(button0, form, null);
    			append_dev(div6, t10);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, h1);
    			append_dev(div4, t12);
    			append_dev(div4, p1);
    			html_tag.m(/*checkedSVG*/ ctx[4], p1);
    			append_dev(p1, t13);
    			append_dev(div4, t14);
    			append_dev(div4, p2);
    			html_tag_1.m(/*checkedSVG*/ ctx[4], p2);
    			append_dev(p2, t15);
    			append_dev(div4, t16);
    			append_dev(div4, p3);
    			html_tag_2.m(/*checkedSVG*/ ctx[4], p3);
    			append_dev(p3, t17);
    			append_dev(div4, t18);
    			append_dev(div4, p4);
    			html_tag_3.m(/*checkedSVG*/ ctx[4], p4);
    			append_dev(p4, t19);
    			append_dev(div4, t20);
    			append_dev(div4, p5);
    			html_tag_4.m(/*checkedSVG*/ ctx[4], p5);
    			append_dev(p5, t21);
    			append_dev(div4, t22);
    			append_dev(div4, p6);
    			html_tag_5.m(/*checkedSVG*/ ctx[4], p6);
    			append_dev(p6, t23);
    			append_dev(div4, t24);
    			append_dev(div4, p7);
    			html_tag_6.m(/*checkedSVG*/ ctx[4], p7);
    			append_dev(p7, t25);
    			append_dev(div4, t26);
    			mount_component(button1, div4, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(p0, "click", /*click_handler*/ ctx[10], false, false, false),
    					listen_dev(form, "submit", /*submitForm*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*isLoading*/ ctx[3]) {
    				if (if_block) {
    					if (dirty & /*isLoading*/ 8) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t0.parentNode, t0);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			const input0_changes = {};

    			if (!updating_value && dirty & /*email*/ 1) {
    				updating_value = true;
    				input0_changes.value = /*email*/ ctx[0];
    				add_flush_callback(() => updating_value = false);
    			}

    			input0.$set(input0_changes);
    			const passwordinput_changes = {};

    			if (!updating_value_1 && dirty & /*password*/ 2) {
    				updating_value_1 = true;
    				passwordinput_changes.value = /*password*/ ctx[1];
    				add_flush_callback(() => updating_value_1 = false);
    			}

    			passwordinput.$set(passwordinput_changes);
    			const input1_changes = {};

    			if (!updating_value_2 && dirty & /*remember*/ 4) {
    				updating_value_2 = true;
    				input1_changes.value = /*remember*/ ctx[2];
    				add_flush_callback(() => updating_value_2 = false);
    			}

    			input1.$set(input1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(logo.$$.fragment, local);
    			transition_in(input0.$$.fragment, local);
    			transition_in(passwordinput.$$.fragment, local);
    			transition_in(input1.$$.fragment, local);
    			transition_in(button0.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			transition_out(logo.$$.fragment, local);
    			transition_out(input0.$$.fragment, local);
    			transition_out(passwordinput.$$.fragment, local);
    			transition_out(input1.$$.fragment, local);
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div6);
    			destroy_component(logo);
    			destroy_component(input0);
    			destroy_component(passwordinput);
    			destroy_component(input1);
    			destroy_component(button0);
    			destroy_component(button1);
    			mounted = false;
    			run_all(dispose);
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
    	validate_slots('SignIn', slots, []);
    	const vscode = acquireVsCodeApi();
    	let email;
    	let password;
    	let remember = false;
    	let isLoading = false;

    	const checkedSVG = `<svg class="checkedSVG" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <style> .checkedSVG{ margin-right: 9px; } </style>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M0 6C0 2.6915 2.6915 0 6 0C9.3085 0 12 2.6915 12 6C12 9.3085 9.3085 12 6 12C2.6915 12 0 9.3085 0 6ZM5.791 7.9785L9.041 4.7285C9.2365 4.533 9.2365 4.217 9.041 4.0215C8.8455 3.826 8.5295 3.826 8.334 4.0215L5.4375 6.918L4.166 5.6465C3.9705 5.451 3.6545 5.451 3.459 5.6465C3.2635 5.842 3.2635 6.158 3.459 6.3535L5.084 7.9785C5.1815 8.076 5.3095 8.125 5.4375 8.125C5.5655 8.125 5.6935 8.076 5.791 7.9785Z" fill="#F9FAFB"/>
    </svg>`;

    	const extensionMessageHandler = async event => {
    		const message = event.data; // The JSON data our extension sent

    		switch (message.type) {
    			case "loginFailed":
    				{
    					$$invalidate(3, isLoading = false);
    					break;
    				}
    		}
    	};

    	window.addEventListener("message", extensionMessageHandler);

    	const submitForm = event => {
    		$$invalidate(3, isLoading = true);
    		event.preventDefault();

    		vscode.postMessage({
    			type: "login",
    			payload: { email, password }
    		});
    	};

    	const openBrowser = url => {
    		vscode.postMessage({ type: "openBrowser", url });
    	};

    	onDestroy(() => {
    		window.removeEventListener("message", extensionMessageHandler);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<SignIn> was created with unknown prop '${key}'`);
    	});

    	function input0_value_binding(value) {
    		email = value;
    		$$invalidate(0, email);
    	}

    	function passwordinput_value_binding(value) {
    		password = value;
    		$$invalidate(1, password);
    	}

    	function input1_value_binding(value) {
    		remember = value;
    		$$invalidate(2, remember);
    	}

    	const click_handler = () => openBrowser("https://app.tailwinduikit.com/login");
    	const click_handler_1 = () => openBrowser("https://www.vsblox.com/pricing");

    	$$self.$capture_state = () => ({
    		vscode,
    		Logo,
    		Spinner,
    		Button,
    		Input,
    		PasswordInput,
    		onDestroy,
    		email,
    		password,
    		remember,
    		isLoading,
    		checkedSVG,
    		extensionMessageHandler,
    		submitForm,
    		openBrowser
    	});

    	$$self.$inject_state = $$props => {
    		if ('email' in $$props) $$invalidate(0, email = $$props.email);
    		if ('password' in $$props) $$invalidate(1, password = $$props.password);
    		if ('remember' in $$props) $$invalidate(2, remember = $$props.remember);
    		if ('isLoading' in $$props) $$invalidate(3, isLoading = $$props.isLoading);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		email,
    		password,
    		remember,
    		isLoading,
    		checkedSVG,
    		submitForm,
    		openBrowser,
    		input0_value_binding,
    		passwordinput_value_binding,
    		input1_value_binding,
    		click_handler,
    		click_handler_1
    	];
    }

    class SignIn extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SignIn",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new SignIn({
        target: document.body,
    });

    return app;

})();
//# sourceMappingURL=SignIn.js.map
