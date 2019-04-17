/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as puppeteer from 'puppeteer';
import { ExtendedDebugClient } from 'vscode-chrome-debug-core-testsupport';
import { BreakpointLocation } from '../intTestSupport';
import { ILaunchRequestArgs } from '../../../src/chromeDebugInterfaces';
import { MakePropertyRequired } from '../core-v2/typeUtils';
import { IValidatedMap } from '../core-v2/chrome/collections/validatedMap';

/*
 * A collection of supporting classes/functions for running framework tests
 */

export interface ProjectSpecProps {
    /** The root directory of the test project */
    projectRoot: string;
    /** Source files directory of the test project */
    projectSrc?: string;
    /** The directory from which to host the project for a test */
    webRoot?: string;
    /** The outfiles directory for the test project */
    outFiles?: string[];
    /** The default launch configuration for the test project */
    launchConfig?: ILaunchRequestArgs;
    /** Port to use for the server */
    port?: number;
    /** Url to use for the project */
    url?: string;
}

/**
 * Specifies an integration test project (i.e. a project that will be launched and
 * attached to in order to test the debug adapter)
 */
export class TestProjectSpec {

    _props: MakePropertyRequired<ProjectSpecProps, keyof ProjectSpecProps>;
    get props() { return this._props; }

    /**
     * @param props Parameters for the project spec. The only required param is "projectRoot", others will be set to sensible defaults
     */
    constructor(props: ProjectSpecProps) {
        const outFiles = props.outFiles || [path.join(props.projectRoot, 'out')];
        const webRoot = props.webRoot || props.projectRoot;
        const port = props.port || 7890;
        const url = props.url || `http://localhost:${port}/`;
        this._props = {
            projectRoot: props.projectRoot,
            projectSrc: props.projectSrc || path.join(props.projectRoot, 'src'),
            webRoot: webRoot,
            outFiles: outFiles,
            port: port,
            url: url,
            launchConfig: props.launchConfig || {
                url: url,
                outFiles: outFiles,
                sourceMaps: true,
                runtimeExecutable: puppeteer.executablePath(),
                webRoot: webRoot
            }
        };
    }

    /**
     * Returns the full path to a source file
     * @param filename
     */
    src(filename: string) {
        return path.join(this.props.projectSrc, filename);
    }
}

/**
 * A wrapper for all the relevant context info needed to run a debug adapter test
 */
export interface FrameworkTestContext {
    /** The test project specs for the currently executing test suite */
    readonly testSpec: TestProjectSpec;
    /** A mapping of labels set in source files to a breakpoint location for a test */
    readonly breakpointLabels: IValidatedMap<string, BreakpointLocation>;
    /** The debug adapter test support client */
    readonly debugClient: ExtendedDebugClient;
}

export class ReassignableFrameworkTestContext implements FrameworkTestContext {
    private _wrapped: FrameworkTestContext = new NotInitializedFrameworkTestContext();

    public get testSpec(): TestProjectSpec {
        return this._wrapped.testSpec;
    }

    public get breakpointLabels(): IValidatedMap<string, BreakpointLocation> {
        return this._wrapped.breakpointLabels;
    }

    public get debugClient(): ExtendedDebugClient {
        return this._wrapped.debugClient;
    }

    public reassignTo(newWrapped: FrameworkTestContext): void {
        this._wrapped = newWrapped;
    }
}

export class NotInitializedFrameworkTestContext implements FrameworkTestContext {
    public get testSpec(): TestProjectSpec {
        return this.throwNotInitializedException();
    }

    public get breakpointLabels(): IValidatedMap<string, BreakpointLocation> {
        return this.throwNotInitializedException();
    }

    public get debugClient(): ExtendedDebugClient {
        return this.throwNotInitializedException();
    }

    private throwNotInitializedException(): never {
        throw new Error(`This test context hasn't been initialized yet. This is probably a bug in the tests`);
    }
}
