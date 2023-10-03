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
    function empty() {
        return text('');
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
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
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

    /* webviews\components\UI\Spinner.svelte generated by Svelte v3.43.1 */

    const file$1 = "webviews\\components\\UI\\Spinner.svelte";

    function create_fragment$1(ctx) {
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
    			add_location(path0, file$1, 7, 2, 116);
    			attr_dev(path1, "d", "M10.143 28.16C12.0394 28.16 13.7237 27.7162 15.1958 26.8285C16.693 25.9161 17.8657 24.6832 18.7141 23.1296C19.5874 21.5515 20.0241 19.7761 20.0241 17.8034C20.0241 15.806 19.5874 14.0306 18.7141 12.4771C17.8657 10.9236 16.693 9.70297 15.1958 8.81525C13.7237 7.90288 12.0394 7.44669 10.143 7.44669C8.57105 7.44669 7.16125 7.75493 5.91365 8.3714C4.66604 8.98786 3.63053 9.82626 2.80711 10.8866V0.160034H0V27.7162H2.80711V24.4982C3.55567 25.6572 4.57871 26.5572 5.87622 27.1983C7.17373 27.8395 8.596 28.16 10.143 28.16ZM9.99332 25.3859C8.6459 25.3859 7.42325 25.053 6.32536 24.3872C5.25242 23.7215 4.39157 22.8214 3.74281 21.6871C3.11901 20.5282 2.80711 19.2336 2.80711 17.8034C2.80711 16.3732 3.11901 15.0909 3.74281 13.9566C4.39157 12.7976 5.25242 11.8853 6.32536 11.2195C7.42325 10.5537 8.6459 10.2208 9.99332 10.2208C11.3407 10.2208 12.5384 10.5537 13.5864 11.2195C14.6594 11.8853 15.4953 12.7853 16.0941 13.9196C16.7179 15.0539 17.0298 16.3485 17.0298 17.8034C17.0298 19.2336 16.7179 20.5282 16.0941 21.6871C15.4953 22.8214 14.6594 23.7215 13.5864 24.3872C12.5384 25.053 11.3407 25.3859 9.99332 25.3859Z");
    			attr_dev(path1, "fill", "url(#paint0_linear_927:3492)");
    			attr_dev(path1, "fill-opacity", "0.75");
    			add_location(path1, file$1, 11, 2, 1263);
    			attr_dev(path2, "d", "M24.2157 27.7162H27.0228V0.160034H24.2157V27.7162Z");
    			attr_dev(path2, "fill", "white");
    			add_location(path2, file$1, 16, 2, 2458);
    			attr_dev(path3, "d", "M24.2157 27.7162H27.0228V0.160034H24.2157V27.7162Z");
    			attr_dev(path3, "fill", "url(#paint1_linear_927:3492)");
    			attr_dev(path3, "fill-opacity", "0.75");
    			add_location(path3, file$1, 17, 2, 2538);
    			attr_dev(path4, "d", "M41.4145 28.16C43.2859 28.16 44.9827 27.7162 46.5048 26.8285C48.0518 25.9407 49.2869 24.7201 50.2102 23.1666C51.1334 21.5885 51.595 19.7884 51.595 17.7664C51.595 15.769 51.1459 13.9936 50.2476 12.4401C49.3743 10.8866 48.1641 9.66598 46.6171 8.77826C45.095 7.89055 43.3608 7.44669 41.4145 7.44669C39.4683 7.44669 37.7216 7.90288 36.1746 8.81525C34.6525 9.70297 33.4423 10.9236 32.5441 12.4771C31.6458 14.0306 31.1967 15.7937 31.1967 17.7664C31.1967 19.7637 31.6458 21.5515 32.5441 23.1296C33.4673 24.6832 34.7024 25.9161 36.2495 26.8285C37.7965 27.7162 39.5182 28.16 41.4145 28.16ZM41.4145 25.3859C40.0671 25.3859 38.8445 25.053 37.7466 24.3872C36.6736 23.7215 35.8128 22.8091 35.164 21.6501C34.5153 20.4912 34.1909 19.1966 34.1909 17.7664C34.1909 16.3362 34.5153 15.0539 35.164 13.9196C35.8128 12.7853 36.6736 11.8853 37.7466 11.2195C38.8445 10.5537 40.0671 10.2208 41.4145 10.2208C42.762 10.2208 43.9721 10.5537 45.0451 11.2195C46.143 11.8853 47.0038 12.7853 47.6276 13.9196C48.2764 15.0539 48.6007 16.3362 48.6007 17.7664C48.6007 19.1966 48.2764 20.4912 47.6276 21.6501C47.0038 22.8091 46.143 23.7215 45.0451 24.3872C43.9721 25.053 42.762 25.3859 41.4145 25.3859Z");
    			attr_dev(path4, "fill", "white");
    			add_location(path4, file$1, 22, 2, 2679);
    			attr_dev(path5, "d", "M41.4145 28.16C43.2859 28.16 44.9827 27.7162 46.5048 26.8285C48.0518 25.9407 49.2869 24.7201 50.2102 23.1666C51.1334 21.5885 51.595 19.7884 51.595 17.7664C51.595 15.769 51.1459 13.9936 50.2476 12.4401C49.3743 10.8866 48.1641 9.66598 46.6171 8.77826C45.095 7.89055 43.3608 7.44669 41.4145 7.44669C39.4683 7.44669 37.7216 7.90288 36.1746 8.81525C34.6525 9.70297 33.4423 10.9236 32.5441 12.4771C31.6458 14.0306 31.1967 15.7937 31.1967 17.7664C31.1967 19.7637 31.6458 21.5515 32.5441 23.1296C33.4673 24.6832 34.7024 25.9161 36.2495 26.8285C37.7965 27.7162 39.5182 28.16 41.4145 28.16ZM41.4145 25.3859C40.0671 25.3859 38.8445 25.053 37.7466 24.3872C36.6736 23.7215 35.8128 22.8091 35.164 21.6501C34.5153 20.4912 34.1909 19.1966 34.1909 17.7664C34.1909 16.3362 34.5153 15.0539 35.164 13.9196C35.8128 12.7853 36.6736 11.8853 37.7466 11.2195C38.8445 10.5537 40.0671 10.2208 41.4145 10.2208C42.762 10.2208 43.9721 10.5537 45.0451 11.2195C46.143 11.8853 47.0038 12.7853 47.6276 13.9196C48.2764 15.0539 48.6007 16.3362 48.6007 17.7664C48.6007 19.1966 48.2764 20.4912 47.6276 21.6501C47.0038 22.8091 46.143 23.7215 45.0451 24.3872C43.9721 25.053 42.762 25.3859 41.4145 25.3859Z");
    			attr_dev(path5, "fill", "url(#paint2_linear_927:3492)");
    			attr_dev(path5, "fill-opacity", "0.75");
    			add_location(path5, file$1, 26, 2, 3887);
    			attr_dev(path6, "d", "M52.5959 27.7162H56.0767L61.3167 20.1706L66.5566 27.7162H70L63.0009 17.8034L70 7.89055H66.5566L61.3167 15.4361L56.0767 7.89055H52.6333L59.6324 17.8034L52.5959 27.7162Z");
    			attr_dev(path6, "fill", "white");
    			add_location(path6, file$1, 31, 2, 5143);
    			attr_dev(path7, "d", "M52.5959 27.7162H56.0767L61.3167 20.1706L66.5566 27.7162H70L63.0009 17.8034L70 7.89055H66.5566L61.3167 15.4361L56.0767 7.89055H52.6333L59.6324 17.8034L52.5959 27.7162Z");
    			attr_dev(path7, "fill", "url(#paint3_linear_927:3492)");
    			attr_dev(path7, "fill-opacity", "0.75");
    			add_location(path7, file$1, 35, 2, 5353);
    			attr_dev(stop0, "stop-color", "#A2FACF");
    			add_location(stop0, file$1, 49, 6, 5811);
    			attr_dev(stop1, "offset", "1");
    			attr_dev(stop1, "stop-color", "#64ACFF");
    			add_location(stop1, file$1, 50, 6, 5848);
    			attr_dev(linearGradient0, "id", "paint0_linear_927:3492");
    			attr_dev(linearGradient0, "x1", "-2.66765e-08");
    			attr_dev(linearGradient0, "y1", "3.66003");
    			attr_dev(linearGradient0, "x2", "69.8689");
    			attr_dev(linearGradient0, "y2", "4.13563");
    			attr_dev(linearGradient0, "gradientUnits", "userSpaceOnUse");
    			add_location(linearGradient0, file$1, 41, 4, 5623);
    			attr_dev(stop2, "stop-color", "#A2FACF");
    			add_location(stop2, file$1, 60, 6, 6105);
    			attr_dev(stop3, "offset", "1");
    			attr_dev(stop3, "stop-color", "#64ACFF");
    			add_location(stop3, file$1, 61, 6, 6142);
    			attr_dev(linearGradient1, "id", "paint1_linear_927:3492");
    			attr_dev(linearGradient1, "x1", "-2.66765e-08");
    			attr_dev(linearGradient1, "y1", "3.66003");
    			attr_dev(linearGradient1, "x2", "69.8689");
    			attr_dev(linearGradient1, "y2", "4.13563");
    			attr_dev(linearGradient1, "gradientUnits", "userSpaceOnUse");
    			add_location(linearGradient1, file$1, 52, 4, 5917);
    			attr_dev(stop4, "stop-color", "#A2FACF");
    			add_location(stop4, file$1, 71, 6, 6399);
    			attr_dev(stop5, "offset", "1");
    			attr_dev(stop5, "stop-color", "#64ACFF");
    			add_location(stop5, file$1, 72, 6, 6436);
    			attr_dev(linearGradient2, "id", "paint2_linear_927:3492");
    			attr_dev(linearGradient2, "x1", "-2.66765e-08");
    			attr_dev(linearGradient2, "y1", "3.66003");
    			attr_dev(linearGradient2, "x2", "69.8689");
    			attr_dev(linearGradient2, "y2", "4.13563");
    			attr_dev(linearGradient2, "gradientUnits", "userSpaceOnUse");
    			add_location(linearGradient2, file$1, 63, 4, 6211);
    			attr_dev(stop6, "stop-color", "#A2FACF");
    			add_location(stop6, file$1, 82, 6, 6693);
    			attr_dev(stop7, "offset", "1");
    			attr_dev(stop7, "stop-color", "#64ACFF");
    			add_location(stop7, file$1, 83, 6, 6730);
    			attr_dev(linearGradient3, "id", "paint3_linear_927:3492");
    			attr_dev(linearGradient3, "x1", "-2.66765e-08");
    			attr_dev(linearGradient3, "y1", "3.66003");
    			attr_dev(linearGradient3, "x2", "69.8689");
    			attr_dev(linearGradient3, "y2", "4.13563");
    			attr_dev(linearGradient3, "gradientUnits", "userSpaceOnUse");
    			add_location(linearGradient3, file$1, 74, 4, 6505);
    			add_location(defs, file$1, 40, 2, 5611);
    			attr_dev(svg, "width", "70");
    			attr_dev(svg, "height", "29");
    			attr_dev(svg, "viewBox", "0 0 70 29");
    			attr_dev(svg, "fill", "none");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "class", "svelte-15iv2p3");
    			add_location(svg, file$1, 0, 0, 0);
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
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
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
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Spinner",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* webviews\components\PreviewComponent\PreviewComponent.svelte generated by Svelte v3.43.1 */
    const file = "webviews\\components\\PreviewComponent\\PreviewComponent.svelte";

    // (31:0) {:else}
    function create_else_block(ctx) {
    	let div;
    	let spinner;
    	let current;
    	spinner = new Spinner({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(spinner.$$.fragment);
    			attr_dev(div, "class", "spinner svelte-6f29sy");
    			add_location(div, file, 31, 2, 738);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(spinner, div, null);
    			current = true;
    		},
    		p: noop,
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
    		id: create_else_block.name,
    		type: "else",
    		source: "(31:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (27:0) {#if imageUrl !== null}
    function create_if_block(ctx) {
    	let div;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			attr_dev(img, "id", "preview");
    			if (!src_url_equal(img.src, img_src_value = /*imageUrl*/ ctx[0])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Preview");
    			add_location(img, file, 28, 4, 666);
    			attr_dev(div, "class", "preview-image svelte-6f29sy");
    			add_location(div, file, 27, 2, 633);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*imageUrl*/ 1 && !src_url_equal(img.src, img_src_value = /*imageUrl*/ ctx[0])) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(27:0) {#if imageUrl !== null}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*imageUrl*/ ctx[0] !== null) return 0;
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
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('PreviewComponent', slots, []);
    	const vscode = acquireVsCodeApi();
    	let imageUrl = null;

    	const extensionMessageHandler = async event => {
    		const message = event.data; // The JSON data our extension sent

    		switch (message.type) {
    			case "gotImageUrl":
    				$$invalidate(0, imageUrl = message.imageUrl);
    		}
    	};

    	window.addEventListener("message", extensionMessageHandler);

    	onDestroy(() => {
    		window.removeEventListener("message", extensionMessageHandler);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<PreviewComponent> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onDestroy,
    		Spinner,
    		vscode,
    		imageUrl,
    		extensionMessageHandler
    	});

    	$$self.$inject_state = $$props => {
    		if ('imageUrl' in $$props) $$invalidate(0, imageUrl = $$props.imageUrl);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [imageUrl];
    }

    class PreviewComponent extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PreviewComponent",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new PreviewComponent({
        target: document.body,
    });

    return app;

})();
//# sourceMappingURL=PreviewComponent.js.map
