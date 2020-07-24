import React from 'react';
import _ from 'lodash';
import { sourcebitDataClient } from 'sourcebit-target-next';
import { withRemoteDataUpdates } from 'sourcebit-target-next/with-remote-data-updates';
import Document, { Head, Main, NextScript } from "next/document";
import pageLayouts from '../layouts';
import TagManager from 'react-gtm-module'

const tagManagerArgs = {
    gtmId: 'GTM-GTM-K7VBQDZ' 
    
}




class Page extends React.Component {

     componentDidMount() {
          TagManager.initialize(tagManagerArgs)
    }
    render() {
        // every page can have different layout, pick the layout based
        // on the model of the page (_type in Sanity CMS)
        const PageLayout = pageLayouts[_.get(this.props, 'page._type')];
        return <PageLayout {...this.props}/>;
    }
}

export async function getStaticPaths() {
    console.log('Page [...slug].js getStaticPaths');
    const paths = await sourcebitDataClient.getStaticPaths();
    return { paths: _.reject(paths, path => path === '/'), fallback: false };
}

export async function getStaticProps({ params }) {
    console.log('Page [...slug].js getStaticProps, params: ', params);
    const pagePath = '/' + params.slug.join('/');
    const props = await sourcebitDataClient.getStaticPropsForPageAtPath(pagePath);
    return { props };
}

export default withRemoteDataUpdates(Page);
