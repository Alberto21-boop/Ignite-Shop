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
    function space() {
        return text(' ');
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
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
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

    const file$1 = "webviews\\components\\UI\\Logo.svelte";

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
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Logo",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* webviews\components\Welcome\Welcome.svelte generated by Svelte v3.43.1 */
    const file = "webviews\\components\\Welcome\\Welcome.svelte";

    function create_fragment(ctx) {
    	let div20;
    	let div2;
    	let div0;
    	let logo;
    	let t0;
    	let h20;
    	let t2;
    	let div1;
    	let t4;
    	let hr;
    	let t5;
    	let div19;
    	let div4;
    	let div3;
    	let a0;
    	let t7;
    	let a1;
    	let t9;
    	let a2;
    	let t11;
    	let a3;
    	let t13;
    	let a4;
    	let t15;
    	let div18;
    	let div6;
    	let h21;
    	let t17;
    	let p0;
    	let t19;
    	let div5;
    	let button0;
    	let t21;
    	let button1;
    	let t23;
    	let div8;
    	let h22;
    	let t25;
    	let p1;
    	let t27;
    	let div7;
    	let img;
    	let img_src_value;
    	let t28;
    	let button2;
    	let t30;
    	let div14;
    	let h23;
    	let t32;
    	let p2;
    	let t34;
    	let p3;
    	let t36;
    	let div13;
    	let div9;
    	let ul0;
    	let li0;
    	let t38;
    	let li1;
    	let t40;
    	let div10;
    	let ul1;
    	let li2;
    	let t42;
    	let li3;
    	let t44;
    	let li4;
    	let t46;
    	let div11;
    	let ul2;
    	let li5;
    	let t48;
    	let li6;
    	let t50;
    	let li7;
    	let t52;
    	let li8;
    	let t54;
    	let div12;
    	let ul3;
    	let li9;
    	let t56;
    	let li10;
    	let t58;
    	let li11;
    	let t60;
    	let form;
    	let input;
    	let t61;
    	let button3;
    	let span;
    	let t63;
    	let div15;
    	let h24;
    	let t65;
    	let p4;
    	let t67;
    	let ul4;
    	let li12;
    	let t69;
    	let li13;
    	let t71;
    	let li14;
    	let t73;
    	let li15;
    	let t75;
    	let li16;
    	let t77;
    	let li17;
    	let t79;
    	let li18;
    	let t81;
    	let li19;
    	let t83;
    	let button4;
    	let t85;
    	let div16;
    	let h25;
    	let t87;
    	let p5;
    	let t89;
    	let h30;
    	let t91;
    	let p6;
    	let t93;
    	let p7;
    	let t95;
    	let h31;
    	let t97;
    	let p8;
    	let t99;
    	let p9;
    	let t101;
    	let div17;
    	let h26;
    	let t103;
    	let ul5;
    	let li20;
    	let button5;
    	let t105;
    	let li21;
    	let button6;
    	let t107;
    	let li22;
    	let button7;
    	let t109;
    	let li23;
    	let button8;
    	let t111;
    	let li24;
    	let button9;
    	let t113;
    	let li25;
    	let button10;
    	let current;
    	let mounted;
    	let dispose;
    	logo = new Logo({ $$inline: true });

    	const block = {
    		c: function create() {
    			div20 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			create_component(logo.$$.fragment);
    			t0 = space();
    			h20 = element("h2");
    			h20.textContent = "- Component library";
    			t2 = space();
    			div1 = element("div");
    			div1.textContent = "Social Links";
    			t4 = space();
    			hr = element("hr");
    			t5 = space();
    			div19 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			a0 = element("a");
    			a0.textContent = "Welcome";
    			t7 = space();
    			a1 = element("a");
    			a1.textContent = "Overview";
    			t9 = space();
    			a2 = element("a");
    			a2.textContent = "What's New";
    			t11 = space();
    			a3 = element("a");
    			a3.textContent = "About blox";
    			t13 = space();
    			a4 = element("a");
    			a4.textContent = "Resources";
    			t15 = space();
    			div18 = element("div");
    			div6 = element("div");
    			h21 = element("h2");
    			h21.textContent = "Welcome";
    			t17 = space();
    			p0 = element("p");
    			p0.textContent = "Thanks for installing blox. We’re glad to have you on board. Currently\r\n          you have access to 250 free codeblocks from Web Application, Marketing\r\n          and Ecommerce UI Kits. Get access to all the premium 1000+ code\r\n          snippets with the Pro version.";
    			t19 = space();
    			div5 = element("div");
    			button0 = element("button");
    			button0.textContent = "Visit Home Page";
    			t21 = space();
    			button1 = element("button");
    			button1.textContent = "Join Community";
    			t23 = space();
    			div8 = element("div");
    			h22 = element("h2");
    			h22.textContent = "Overview";
    			t25 = space();
    			p1 = element("p");
    			p1.textContent = "Watch the following video to understand the working of blox and what\r\n          it offers";
    			t27 = space();
    			div7 = element("div");
    			img = element("img");
    			t28 = space();
    			button2 = element("button");
    			button2.textContent = "Go pro";
    			t30 = space();
    			div14 = element("div");
    			h23 = element("h2");
    			h23.textContent = "What's New";
    			t32 = space();
    			p2 = element("p");
    			p2.textContent = "The team behind blox is working very hard to add new code snippets and\r\n          improve the over all developer experience. Follow all the new\r\n          additions and improvements to blox here";
    			t34 = space();
    			p3 = element("p");
    			p3.textContent = "Follow all the new updates with our newsletter";
    			t36 = space();
    			div13 = element("div");
    			div9 = element("div");
    			ul0 = element("ul");
    			li0 = element("li");
    			li0.textContent = "Enhanced 40+ components from Marketing UI Kit";
    			t38 = space();
    			li1 = element("li");
    			li1.textContent = "Added 10+ components in Ecommerce Category";
    			t40 = space();
    			div10 = element("div");
    			ul1 = element("ul");
    			li2 = element("li");
    			li2.textContent = "Preview added to Code Blocks";
    			t42 = space();
    			li3 = element("li");
    			li3.textContent = "Preview Button Added";
    			t44 = space();
    			li4 = element("li");
    			li4.textContent = "Performance Enhacement";
    			t46 = space();
    			div11 = element("div");
    			ul2 = element("ul");
    			li5 = element("li");
    			li5.textContent = "VS Code native theme Support";
    			t48 = space();
    			li6 = element("li");
    			li6.textContent = "Fixed minor bugs";
    			t50 = space();
    			li7 = element("li");
    			li7.textContent = "UI Improvements";
    			t52 = space();
    			li8 = element("li");
    			li8.textContent = "Performance Enhancement";
    			t54 = space();
    			div12 = element("div");
    			ul3 = element("ul");
    			li9 = element("li");
    			li9.textContent = "10 FREE code blocks added";
    			t56 = space();
    			li10 = element("li");
    			li10.textContent = "25 Pro code blocks added";
    			t58 = space();
    			li11 = element("li");
    			li11.textContent = "Support for Angular";
    			t60 = space();
    			form = element("form");
    			input = element("input");
    			t61 = space();
    			button3 = element("button");
    			span = element("span");
    			span.textContent = "Get notified";
    			t63 = space();
    			div15 = element("div");
    			h24 = element("h2");
    			h24.textContent = "License";
    			t65 = space();
    			p4 = element("p");
    			p4.textContent = "You only get 250 code blocks with the free version.You can Go Pro to\r\n          take advantage of blox’s full potential with 1000+ code blocks from\r\n          WebApplication, Ecommerce and Marekting UI Kits. With the Pro version\r\n          you get:";
    			t67 = space();
    			ul4 = element("ul");
    			li12 = element("li");
    			li12.textContent = "550+ Web App code blocks";
    			t69 = space();
    			li13 = element("li");
    			li13.textContent = "250+ Marketing code blocks";
    			t71 = space();
    			li14 = element("li");
    			li14.textContent = "200+ Ecommerce code blocks";
    			t73 = space();
    			li15 = element("li");
    			li15.textContent = "Free Bootstrap & MaterialUI update";
    			t75 = space();
    			li16 = element("li");
    			li16.textContent = "React, Angular, & Vue support";
    			t77 = space();
    			li17 = element("li");
    			li17.textContent = "Premium support";
    			t79 = space();
    			li18 = element("li");
    			li18.textContent = "Lifetime access";
    			t81 = space();
    			li19 = element("li");
    			li19.textContent = "Use on Unlimited Projects";
    			t83 = space();
    			button4 = element("button");
    			button4.textContent = "Go pro";
    			t85 = space();
    			div16 = element("div");
    			h25 = element("h2");
    			h25.textContent = "About blox";
    			t87 = space();
    			p5 = element("p");
    			p5.textContent = "We are dedicated to providing you with the best of our product and\r\n          ensuring that you don’t delve into complex things. To make things\r\n          smoother for all the developers out there.";
    			t89 = space();
    			h30 = element("h3");
    			h30.textContent = "Usage of the extension:";
    			t91 = space();
    			p6 = element("p");
    			p6.textContent = "Publisher and extension IDs are used to define an extension uniquely.\r\n          If you select the Blox extension, you will automatically see the\r\n          extension’s detail page, where you can find the extension ID.";
    			t93 = space();
    			p7 = element("p");
    			p7.textContent = "Knowing the extension ID can be very beneficial for you if there are\r\n          multiple extensions with a similar name. Click the install button, and\r\n          your extension will be downloaded and installed from the Marketplace\r\n          by VS Code. The install is changed with a Manage gear button when the\r\n          installation is completed.";
    			t95 = space();
    			h31 = element("h3");
    			h31.textContent = "Perks of Blox extension:";
    			t97 = space();
    			p8 = element("p");
    			p8.textContent = "Besides, out of 1500 components, blox provides 250 free code blocks,\r\n          and you can even search for the desired code block by using the\r\n          navigation bar.";
    			t99 = space();
    			p9 = element("p");
    			p9.textContent = "Moreover, the Blox extension also contributes numerous commands (name\r\n          of the commands if there are any)that you can find in the Commands\r\n          option. These commands let you quickly access the (function that the\r\n          commands provide).";
    			t101 = space();
    			div17 = element("div");
    			h26 = element("h2");
    			h26.textContent = "Resources";
    			t103 = space();
    			ul5 = element("ul");
    			li20 = element("li");
    			button5 = element("button");
    			button5.textContent = "Website";
    			t105 = space();
    			li21 = element("li");
    			button6 = element("button");
    			button6.textContent = "Documentation";
    			t107 = space();
    			li22 = element("li");
    			button7 = element("button");
    			button7.textContent = "Pricing";
    			t109 = space();
    			li23 = element("li");
    			button8 = element("button");
    			button8.textContent = "Changelog";
    			t111 = space();
    			li24 = element("li");
    			button9 = element("button");
    			button9.textContent = "FAQ";
    			t113 = space();
    			li25 = element("li");
    			button10 = element("button");
    			button10.textContent = "Blog";
    			attr_dev(h20, "class", "svelte-109gf57");
    			add_location(h20, file, 49, 6, 1212);
    			attr_dev(div0, "class", "logo svelte-109gf57");
    			add_location(div0, file, 47, 4, 1170);
    			attr_dev(div1, "class", "social-links");
    			add_location(div1, file, 51, 4, 1258);
    			attr_dev(div2, "class", "top-bar svelte-109gf57");
    			add_location(div2, file, 46, 2, 1143);
    			attr_dev(hr, "class", "svelte-109gf57");
    			add_location(hr, file, 53, 2, 1316);
    			attr_dev(a0, "href", "#welcome");
    			attr_dev(a0, "class", "svelte-109gf57");
    			add_location(a0, file, 57, 8, 1419);
    			attr_dev(a1, "href", "#overview");
    			attr_dev(a1, "class", "svelte-109gf57");
    			add_location(a1, file, 58, 8, 1459);
    			attr_dev(a2, "href", "#new");
    			attr_dev(a2, "class", "svelte-109gf57");
    			add_location(a2, file, 59, 8, 1501);
    			attr_dev(a3, "href", "#about");
    			attr_dev(a3, "class", "svelte-109gf57");
    			add_location(a3, file, 60, 8, 1540);
    			attr_dev(a4, "href", "#resources");
    			attr_dev(a4, "class", "svelte-109gf57");
    			add_location(a4, file, 61, 8, 1581);
    			attr_dev(div3, "class", "navbar");
    			add_location(div3, file, 56, 6, 1389);
    			attr_dev(div4, "class", "sidebar svelte-109gf57");
    			add_location(div4, file, 55, 4, 1360);
    			attr_dev(h21, "class", "svelte-109gf57");
    			add_location(h21, file, 66, 8, 1701);
    			attr_dev(p0, "class", "svelte-109gf57");
    			add_location(p0, file, 67, 8, 1727);
    			attr_dev(button0, "class", "btn btn-primary svelte-109gf57");
    			add_location(button0, file, 74, 10, 2076);
    			attr_dev(button1, "class", "btn btn-secondary svelte-109gf57");
    			add_location(button1, file, 80, 10, 2286);
    			attr_dev(div5, "class", "welcome-buttons svelte-109gf57");
    			add_location(div5, file, 73, 8, 2035);
    			attr_dev(div6, "id", "welcome");
    			attr_dev(div6, "class", "svelte-109gf57");
    			add_location(div6, file, 65, 6, 1673);
    			attr_dev(h22, "class", "svelte-109gf57");
    			add_location(h22, file, 86, 8, 2469);
    			attr_dev(p1, "class", "svelte-109gf57");
    			add_location(p1, file, 87, 8, 2496);
    			if (!src_url_equal(img.src, img_src_value = "https://cdn.tuk.dev/blox/blox-youtube.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "blox Introduction");
    			attr_dev(img, "class", "svelte-109gf57");
    			add_location(img, file, 92, 10, 2659);
    			attr_dev(button2, "class", "btn btn-primary btn--large svelte-109gf57");
    			add_location(button2, file, 98, 10, 2891);
    			attr_dev(div7, "class", "video-box svelte-109gf57");
    			add_location(div7, file, 91, 8, 2624);
    			attr_dev(div8, "id", "overview");
    			attr_dev(div8, "class", "svelte-109gf57");
    			add_location(div8, file, 85, 6, 2440);
    			attr_dev(h23, "class", "svelte-109gf57");
    			add_location(h23, file, 106, 8, 3126);
    			attr_dev(p2, "class", "svelte-109gf57");
    			add_location(p2, file, 107, 8, 3155);
    			attr_dev(p3, "class", "svelte-109gf57");
    			add_location(p3, file, 112, 8, 3388);
    			attr_dev(li0, "class", "svelte-109gf57");
    			add_location(li0, file, 117, 14, 3544);
    			attr_dev(li1, "class", "svelte-109gf57");
    			add_location(li1, file, 118, 14, 3614);
    			attr_dev(ul0, "class", "svelte-109gf57");
    			add_location(ul0, file, 116, 12, 3524);
    			attr_dev(div9, "class", "update svelte-109gf57");
    			add_location(div9, file, 115, 10, 3490);
    			attr_dev(li2, "class", "svelte-109gf57");
    			add_location(li2, file, 123, 14, 3768);
    			attr_dev(li3, "class", "svelte-109gf57");
    			add_location(li3, file, 124, 14, 3821);
    			attr_dev(li4, "class", "svelte-109gf57");
    			add_location(li4, file, 125, 14, 3866);
    			attr_dev(ul1, "class", "svelte-109gf57");
    			add_location(ul1, file, 122, 12, 3748);
    			attr_dev(div10, "class", "update svelte-109gf57");
    			add_location(div10, file, 121, 10, 3714);
    			attr_dev(li5, "class", "svelte-109gf57");
    			add_location(li5, file, 130, 14, 4000);
    			attr_dev(li6, "class", "svelte-109gf57");
    			add_location(li6, file, 131, 14, 4053);
    			attr_dev(li7, "class", "svelte-109gf57");
    			add_location(li7, file, 132, 14, 4094);
    			attr_dev(li8, "class", "svelte-109gf57");
    			add_location(li8, file, 133, 14, 4134);
    			attr_dev(ul2, "class", "svelte-109gf57");
    			add_location(ul2, file, 129, 12, 3980);
    			attr_dev(div11, "class", "update svelte-109gf57");
    			add_location(div11, file, 128, 10, 3946);
    			attr_dev(li9, "class", "svelte-109gf57");
    			add_location(li9, file, 138, 14, 4269);
    			attr_dev(li10, "class", "svelte-109gf57");
    			add_location(li10, file, 139, 14, 4319);
    			attr_dev(li11, "class", "svelte-109gf57");
    			add_location(li11, file, 140, 14, 4368);
    			attr_dev(ul3, "class", "svelte-109gf57");
    			add_location(ul3, file, 137, 12, 4249);
    			attr_dev(div12, "class", "update svelte-109gf57");
    			add_location(div12, file, 136, 10, 4215);
    			attr_dev(div13, "class", "new-content svelte-109gf57");
    			add_location(div13, file, 114, 8, 3453);
    			attr_dev(input, "type", "email");
    			attr_dev(input, "placeholder", "Enter your email");
    			input.required = true;
    			attr_dev(input, "class", "svelte-109gf57");
    			add_location(input, file, 146, 10, 4519);
    			attr_dev(span, "class", "svelte-109gf57");
    			add_location(span, file, 152, 43, 4708);
    			attr_dev(button3, "class", "btn btn-tertiary svelte-109gf57");
    			add_location(button3, file, 152, 10, 4675);
    			attr_dev(form, "class", "svelte-109gf57");
    			add_location(form, file, 145, 8, 4461);
    			attr_dev(div14, "id", "new");
    			attr_dev(div14, "class", "svelte-109gf57");
    			add_location(div14, file, 105, 6, 3102);
    			attr_dev(h24, "class", "svelte-109gf57");
    			add_location(h24, file, 156, 8, 4809);
    			attr_dev(p4, "class", "svelte-109gf57");
    			add_location(p4, file, 157, 8, 4835);
    			attr_dev(li12, "class", "svelte-109gf57");
    			add_location(li12, file, 164, 10, 5138);
    			attr_dev(li13, "class", "svelte-109gf57");
    			add_location(li13, file, 165, 10, 5183);
    			attr_dev(li14, "class", "svelte-109gf57");
    			add_location(li14, file, 166, 10, 5230);
    			attr_dev(li15, "class", "svelte-109gf57");
    			add_location(li15, file, 167, 10, 5277);
    			attr_dev(li16, "class", "svelte-109gf57");
    			add_location(li16, file, 168, 10, 5332);
    			attr_dev(li17, "class", "svelte-109gf57");
    			add_location(li17, file, 169, 10, 5382);
    			attr_dev(li18, "class", "svelte-109gf57");
    			add_location(li18, file, 170, 10, 5418);
    			attr_dev(li19, "class", "svelte-109gf57");
    			add_location(li19, file, 171, 10, 5454);
    			attr_dev(ul4, "class", "svelte-109gf57");
    			add_location(ul4, file, 163, 8, 5122);
    			attr_dev(button4, "class", "btn btn-primary svelte-109gf57");
    			add_location(button4, file, 173, 8, 5513);
    			attr_dev(div15, "id", "license");
    			attr_dev(div15, "class", "svelte-109gf57");
    			add_location(div15, file, 155, 6, 4781);
    			attr_dev(h25, "class", "svelte-109gf57");
    			add_location(h25, file, 180, 8, 5715);
    			attr_dev(p5, "class", "svelte-109gf57");
    			add_location(p5, file, 181, 8, 5744);
    			attr_dev(h30, "class", "svelte-109gf57");
    			add_location(h30, file, 186, 8, 5980);
    			attr_dev(p6, "class", "svelte-109gf57");
    			add_location(p6, file, 187, 8, 6022);
    			attr_dev(p7, "class", "svelte-109gf57");
    			add_location(p7, file, 192, 8, 6279);
    			attr_dev(h31, "class", "svelte-109gf57");
    			add_location(h31, file, 199, 8, 6667);
    			attr_dev(p8, "class", "svelte-109gf57");
    			add_location(p8, file, 200, 8, 6710);
    			attr_dev(p9, "class", "svelte-109gf57");
    			add_location(p9, file, 205, 8, 6919);
    			attr_dev(div16, "id", "about");
    			attr_dev(div16, "class", "svelte-109gf57");
    			add_location(div16, file, 179, 6, 5689);
    			attr_dev(h26, "class", "svelte-109gf57");
    			add_location(h26, file, 213, 8, 7257);
    			attr_dev(button5, "class", "btn-link svelte-109gf57");
    			add_location(button5, file, 216, 12, 7319);
    			attr_dev(li20, "class", "svelte-109gf57");
    			add_location(li20, file, 215, 10, 7301);
    			attr_dev(button6, "class", "btn-link svelte-109gf57");
    			add_location(button6, file, 224, 12, 7559);
    			attr_dev(li21, "class", "svelte-109gf57");
    			add_location(li21, file, 223, 10, 7541);
    			attr_dev(button7, "class", "btn-link svelte-109gf57");
    			add_location(button7, file, 233, 12, 7840);
    			attr_dev(li22, "class", "svelte-109gf57");
    			add_location(li22, file, 232, 10, 7822);
    			attr_dev(button8, "class", "btn-link svelte-109gf57");
    			add_location(button8, file, 240, 12, 8051);
    			attr_dev(li23, "class", "svelte-109gf57");
    			add_location(li23, file, 239, 10, 8033);
    			attr_dev(button9, "class", "btn-link svelte-109gf57");
    			add_location(button9, file, 249, 12, 8322);
    			attr_dev(li24, "class", "svelte-109gf57");
    			add_location(li24, file, 248, 10, 8304);
    			attr_dev(button10, "class", "btn-link svelte-109gf57");
    			add_location(button10, file, 257, 12, 8561);
    			attr_dev(li25, "class", "svelte-109gf57");
    			add_location(li25, file, 256, 10, 8543);
    			attr_dev(ul5, "class", "svelte-109gf57");
    			add_location(ul5, file, 214, 8, 7285);
    			attr_dev(div17, "id", "resources");
    			attr_dev(div17, "class", "svelte-109gf57");
    			add_location(div17, file, 212, 6, 7227);
    			attr_dev(div18, "class", "main svelte-109gf57");
    			add_location(div18, file, 64, 4, 1647);
    			attr_dev(div19, "class", "data-container svelte-109gf57");
    			add_location(div19, file, 54, 2, 1326);
    			attr_dev(div20, "class", "app svelte-109gf57");
    			add_location(div20, file, 45, 0, 1122);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div20, anchor);
    			append_dev(div20, div2);
    			append_dev(div2, div0);
    			mount_component(logo, div0, null);
    			append_dev(div0, t0);
    			append_dev(div0, h20);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div20, t4);
    			append_dev(div20, hr);
    			append_dev(div20, t5);
    			append_dev(div20, div19);
    			append_dev(div19, div4);
    			append_dev(div4, div3);
    			append_dev(div3, a0);
    			append_dev(div3, t7);
    			append_dev(div3, a1);
    			append_dev(div3, t9);
    			append_dev(div3, a2);
    			append_dev(div3, t11);
    			append_dev(div3, a3);
    			append_dev(div3, t13);
    			append_dev(div3, a4);
    			append_dev(div19, t15);
    			append_dev(div19, div18);
    			append_dev(div18, div6);
    			append_dev(div6, h21);
    			append_dev(div6, t17);
    			append_dev(div6, p0);
    			append_dev(div6, t19);
    			append_dev(div6, div5);
    			append_dev(div5, button0);
    			append_dev(div5, t21);
    			append_dev(div5, button1);
    			append_dev(div18, t23);
    			append_dev(div18, div8);
    			append_dev(div8, h22);
    			append_dev(div8, t25);
    			append_dev(div8, p1);
    			append_dev(div8, t27);
    			append_dev(div8, div7);
    			append_dev(div7, img);
    			append_dev(div7, t28);
    			append_dev(div7, button2);
    			append_dev(div18, t30);
    			append_dev(div18, div14);
    			append_dev(div14, h23);
    			append_dev(div14, t32);
    			append_dev(div14, p2);
    			append_dev(div14, t34);
    			append_dev(div14, p3);
    			append_dev(div14, t36);
    			append_dev(div14, div13);
    			append_dev(div13, div9);
    			append_dev(div9, ul0);
    			append_dev(ul0, li0);
    			append_dev(ul0, t38);
    			append_dev(ul0, li1);
    			append_dev(div13, t40);
    			append_dev(div13, div10);
    			append_dev(div10, ul1);
    			append_dev(ul1, li2);
    			append_dev(ul1, t42);
    			append_dev(ul1, li3);
    			append_dev(ul1, t44);
    			append_dev(ul1, li4);
    			append_dev(div13, t46);
    			append_dev(div13, div11);
    			append_dev(div11, ul2);
    			append_dev(ul2, li5);
    			append_dev(ul2, t48);
    			append_dev(ul2, li6);
    			append_dev(ul2, t50);
    			append_dev(ul2, li7);
    			append_dev(ul2, t52);
    			append_dev(ul2, li8);
    			append_dev(div13, t54);
    			append_dev(div13, div12);
    			append_dev(div12, ul3);
    			append_dev(ul3, li9);
    			append_dev(ul3, t56);
    			append_dev(ul3, li10);
    			append_dev(ul3, t58);
    			append_dev(ul3, li11);
    			append_dev(div14, t60);
    			append_dev(div14, form);
    			append_dev(form, input);
    			set_input_value(input, /*email*/ ctx[0]);
    			append_dev(form, t61);
    			append_dev(form, button3);
    			append_dev(button3, span);
    			append_dev(div18, t63);
    			append_dev(div18, div15);
    			append_dev(div15, h24);
    			append_dev(div15, t65);
    			append_dev(div15, p4);
    			append_dev(div15, t67);
    			append_dev(div15, ul4);
    			append_dev(ul4, li12);
    			append_dev(ul4, t69);
    			append_dev(ul4, li13);
    			append_dev(ul4, t71);
    			append_dev(ul4, li14);
    			append_dev(ul4, t73);
    			append_dev(ul4, li15);
    			append_dev(ul4, t75);
    			append_dev(ul4, li16);
    			append_dev(ul4, t77);
    			append_dev(ul4, li17);
    			append_dev(ul4, t79);
    			append_dev(ul4, li18);
    			append_dev(ul4, t81);
    			append_dev(ul4, li19);
    			append_dev(div15, t83);
    			append_dev(div15, button4);
    			append_dev(div18, t85);
    			append_dev(div18, div16);
    			append_dev(div16, h25);
    			append_dev(div16, t87);
    			append_dev(div16, p5);
    			append_dev(div16, t89);
    			append_dev(div16, h30);
    			append_dev(div16, t91);
    			append_dev(div16, p6);
    			append_dev(div16, t93);
    			append_dev(div16, p7);
    			append_dev(div16, t95);
    			append_dev(div16, h31);
    			append_dev(div16, t97);
    			append_dev(div16, p8);
    			append_dev(div16, t99);
    			append_dev(div16, p9);
    			append_dev(div18, t101);
    			append_dev(div18, div17);
    			append_dev(div17, h26);
    			append_dev(div17, t103);
    			append_dev(div17, ul5);
    			append_dev(ul5, li20);
    			append_dev(li20, button5);
    			append_dev(ul5, t105);
    			append_dev(ul5, li21);
    			append_dev(li21, button6);
    			append_dev(ul5, t107);
    			append_dev(ul5, li22);
    			append_dev(li22, button7);
    			append_dev(ul5, t109);
    			append_dev(ul5, li23);
    			append_dev(li23, button8);
    			append_dev(ul5, t111);
    			append_dev(ul5, li24);
    			append_dev(li24, button9);
    			append_dev(ul5, t113);
    			append_dev(ul5, li25);
    			append_dev(li25, button10);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[3], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[4], false, false, false),
    					listen_dev(img, "click", /*click_handler_2*/ ctx[5], false, false, false),
    					listen_dev(button2, "click", /*click_handler_3*/ ctx[6], false, false, false),
    					listen_dev(input, "input", /*input_input_handler*/ ctx[7]),
    					listen_dev(form, "submit", /*submit_handler*/ ctx[8], false, false, false),
    					listen_dev(button4, "click", /*click_handler_4*/ ctx[9], false, false, false),
    					listen_dev(button5, "click", /*click_handler_5*/ ctx[10], false, false, false),
    					listen_dev(button6, "click", /*click_handler_6*/ ctx[11], false, false, false),
    					listen_dev(button7, "click", /*click_handler_7*/ ctx[12], false, false, false),
    					listen_dev(button8, "click", /*click_handler_8*/ ctx[13], false, false, false),
    					listen_dev(button9, "click", /*click_handler_9*/ ctx[14], false, false, false),
    					listen_dev(button10, "click", /*click_handler_10*/ ctx[15], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*email*/ 1 && input.value !== /*email*/ ctx[0]) {
    				set_input_value(input, /*email*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(logo.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(logo.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div20);
    			destroy_component(logo);
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
    	validate_slots('Welcome', slots, []);
    	const vscode = acquireVsCodeApi();
    	let email = "";

    	const openBrowser = url => {
    		vscode.postMessage({ type: "openBrowser", url });
    	};

    	const subscribe = event => {
    		event.preventDefault();

    		fetch("https://7jn82juu23.execute-api.us-west-1.amazonaws.com/dev/newsletter/subscribe", {
    			method: "POST",
    			body: JSON.stringify({ email })
    		}).then(response => response.json()).then(response => {
    			if (response.success) {
    				vscode.postMessage({
    					type: "onMessage",
    					message: "Subscribed successfully!"
    				});

    				$$invalidate(0, email = "");
    			} else {
    				vscode.postMessage({
    					type: "onError",
    					message: "Something went wrong. Please try again later."
    				});
    			}
    		}).catch(error => {
    			vscode.postMessage({
    				type: "onError",
    				message: erorr.message || JSON.stringify(error)
    			});
    		});
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Welcome> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => openBrowser("https://blox-marketing-website.vercel.app/");
    	const click_handler_1 = () => openBrowser("");
    	const click_handler_2 = () => openBrowser("https://www.youtube.com/watch?v=FU9aoR8ZBqI");
    	const click_handler_3 = () => openBrowser("https://www.vsblox.com/pricing");

    	function input_input_handler() {
    		email = this.value;
    		$$invalidate(0, email);
    	}

    	const submit_handler = event => subscribe(event);
    	const click_handler_4 = () => openBrowser("https://www.vsblox.com/pricing");
    	const click_handler_5 = () => openBrowser("https://blox-marketing-website.vercel.app/");
    	const click_handler_6 = () => openBrowser("https://blox-marketing-website.vercel.app/documentation");
    	const click_handler_7 = () => openBrowser("https://www.vsblox.com/pricing");
    	const click_handler_8 = () => openBrowser("https://blox-marketing-website.vercel.app/updates");
    	const click_handler_9 = () => openBrowser("https://blox-marketing-website.vercel.app/faq");
    	const click_handler_10 = () => openBrowser("https://blox-marketing-website.vercel.app/blog");

    	$$self.$capture_state = () => ({
    		Logo,
    		vscode,
    		email,
    		openBrowser,
    		subscribe
    	});

    	$$self.$inject_state = $$props => {
    		if ('email' in $$props) $$invalidate(0, email = $$props.email);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		email,
    		openBrowser,
    		subscribe,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		input_input_handler,
    		submit_handler,
    		click_handler_4,
    		click_handler_5,
    		click_handler_6,
    		click_handler_7,
    		click_handler_8,
    		click_handler_9,
    		click_handler_10
    	];
    }

    class Welcome extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Welcome",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new Welcome({
        target: document.body,
    });

    return app;

})();
//# sourceMappingURL=Welcome.js.map
