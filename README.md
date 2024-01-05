
[![PyPI status](https://img.shields.io/pypi/status/ansicolortags.svg)](https://pypi.python.org/pypi/ansicolortags/) 

# Apigee Edge - Application Integration

**This is not an official Google product.**<BR>This implementation is not an official Google product, nor is it part of an official Google product. Support is available on a best-effort basis via GitHub.

***

## Intro

This repository contains a proxy for Apigee Edge only to call a [Google Cloud Application Integration](https://cloud.google.com/application-integration?hl=en) Flow. 
>It doesn't use Apigee Edge extension features.


The flow principle is:
1. Retrieve Service Account JSON Key from KVM (Policy KV.Lookup-SA-Key)
2. Set OAuth 2.0 Scopes for Google APIs (Policy AM.GCPScopes)
3. Call Sharedflow to get an Access Toke (Policy FC.gcpAuthent)
4. Extract one parameter from URL (Polices AM-setProductID and EV-getProductID)
5. Set Header and Payload required by GCP Application Integration (Policy AM-setIntegrationVariables)
6. Call the GCP Application Integration [projects.locations.integrations.execute API](https://cloud.google.com/application-integration/docs/reference/rest/v1/projects.locations.integrations/execute)
7. Extract Data from returned payload (Policy JS-formatResponse)

<BR>

![Proxy Overview](/images/trace.png)

<BR>

## Requirement

- A Google Cloud Platform account 
- A Google Cloud Application Integration Service 
- An Apigee Edge organization 


## Installation

0. (option) Install Apigee Sackmesser<BR>The Apigee Sackmesser lets you deploy API proxies, shared flows and configuration to Apigee Edge (as well as Apigee hybrid/X) without writing any additional manifest files. Sackmesser commands are provided as samples in this repo.<BR>Source: [Github Apigee Devrel](https://github.com/apigee/devrel/tree/main/tools/apigee-sackmesser) 

1. If needed, set up a Google Cloud Application Integration Service and create an Integration Flow, having an API trigger. See [Set up Application Integration](https://cloud.google.com/application-integration/docs/setup-application-integration).

> The Apigee proxy provided was designed to call this Application Integration Flow, having one input string parameter : **productID**. The flow allows to query a BigQuery table to retrieve products list or one product details.

<BR>

![applicationIntegrationFlow](/images/applicationIntegrationFlow.png)

<BR>

2. Create GCP Service Accounts<BR>To authorize Apigee Edge to use Google Cloud Application Integration, you must first: 
    - Create a service account in Google Cloud and assign it the necessary roles to execute your Application Integration flow: depending on the resource type, **integrations.apigeeIntegrations.invoke** or **integrations.integrations.invoke** (see [Applicaton Integration execute: IAM permissions](https://cloud.google.com/application-integration/docs/reference/rest/v1/projects.locations.integrations/execute#iam-permissions) and [Understanding GCP roles](https://cloud.google.com/iam/docs/understanding-roles)).
    - Create a key and download the json key file for the service account

    To create Service Account in your GCP project, you can use following gcloud commands (or GCP Web UI):

    ```sh
    export SA_NAME=<your-new-service-account-name>

    gcloud iam service-accounts create $SA_NAME --display-name="Apigee Edge Service Account"

    export PROJECT_ID=$(gcloud config get-value project)
    export APPINT_SA=$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com

    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$APPINT_SA" \
    --role="roles/integrations.integrationInvoker"

    gcloud iam service-accounts keys create $SA_NAME-key.json --iam-account=$APPINT_SA --key-file-type=json 

    ```

    Copy `<your-new-service-account-name>-key.json` file content to clipboard. 


3. Create a KVM in the target Apigee Environment. <BR>Add an **encrypted** KVM entry in it. Paste the JSON content of the Service Account JSON key file, downloaded in step 2.

    Example: straight deployment to Apigee Edge using [Sackmesser](https://github.com/apigee/devrel/tree/main/tools/apigee-sackmesser), from local repository. 
    - convert SA json key file data to string<BR>You can use the following commmand:
        ```bash
        cat <YOUR-SA-JSON-KEY-FILE> | jq -c | jq -R
        ```
    and copy the result to your clipboard.
    - update `./resources/edge/<YOUR-ENV-NAME>/kvms.json` with
        - **name**= your new KVM name (default value: **appint-sa**)
        - **entry.name**= your new KVM entry name (default value: **gcp-sa-key**)
        - **entry.value**= SA json key file content converted to string
    - rename folder `./resources/edge/<YOUR-ENV-NAME>` to your Apigee target environment name
    
    The KVM will be created and populated when you wil use the Sackmesser deploy command in step 6.
    


4. Install Apigee GCP SA Shareflow<BR>This sharedflow is used to obtain access tokens for Google Cloud service accounts. Access tokens are cached in a dedicated environment cache resource for 10min, and used to call GCP services.<BR>Source: [Github Apigee Devrel SA Auth Sharedflow](https://github.com/apigee/devrel/tree/main/references/gcp-sa-auth-shared-flow).

    Example: straight deployment to Apigee Edge using [Sackmesser](https://github.com/apigee/devrel/tree/main/tools/apigee-sackmesser), directly from Git repository. 


    ```bash
    export APIGEE_EDGE_USR=<YOUR-USER-NAME>
    export APIGEE_EDGE_PWD=<YOUR-USER-PASSWORD>
    export APIGEE_EDGE_ORG=<YOUR-ORG-NAME>
    export APIGEE_EDGE_ENV=<YOUR-ENV-NAME>
    sackmesser deploy --apigeeapi -u $APIGEE_EDGE_USR -p $APIGEE_EDGE_PWD \
    -o $APIGEE_EDGE_ORG -e $APIGEE_EDGE_ENV \ 
    -g https://github.com/apigee/devrel/tree/main/references/gcp-sa-auth-shared-flow
    ```

    > You can also use Apigee Edge UI, [Apigee Edge Deploy Maven Plugin](https://github.com/apigee/apigee-deploy-maven-plugin/tree/1.x) or [apigeetool](https://github.com/apigee/apigeetool-node), to deploy the sharedflow.



5. Configure the Apigee proxy<BR>
   
   1. Update AM-setIntegrationVariables policy file: `./apiproxy/policies/AM-setIntegrationVariables.xml`.
   <BR>Set **ProjectId**, **IntegrationName**, **ApiTrigger**, **Region** and **parameters_keys_values_string** values with your GCP Project and Application Integration values:

    ```xml
        <AssignVariable>
            <Name>ProjectId</Name>
            <Value>xxxxx</Value>
        </AssignVariable>
        <AssignVariable>
            <Name>IntegrationName</Name>
            <Value>xxxxx</Value>
        </AssignVariable>
        <AssignVariable>
            <Name>ApiTrigger</Name>
            <Value>api_trigger/xxxxx</Value>
        </AssignVariable>
        <AssignVariable>
            <Name>Region</Name>
            <Value>xxxxx</Value>
        </AssignVariable>
        <AssignVariable>
            <Name>parameters_keys_values_string</Name>
            <Template>{"productID":{"string_value":"{productID}"}}</Template>
        </AssignVariable>
    ```

    2. Update KV.Lookup-SA-Key policy file: `./apiproxy/policies/KV.Lookup-SA-Key.xml`.
   <BR>Set **mapIdentifier**, *key.parameter** values with your KVM Name and KVM Entry Name values:

    ```xml
        <KeyValueMapOperations name="KV.Lookup-SA-Key" mapIdentifier="xxxxx">
            <ExpiryTimeInSecs>300</ExpiryTimeInSecs>
            <Get assignTo="private.gcp.service_account.key">
                <Key>
                    <Parameter>xxxxx</Parameter>
                </Key>
            </Get>
        </KeyValueMapOperations>
    ```

    3. If needed you can also change the base path of the proxy in the `./apiproxy/proxies/default.xml` file: **BasePath** parameter.
    <BR>By default, base path is set to `/v1/appint`.



6. Deploy Apigee proxy to your Apigee organization

    Example: straight deployment to Apigee Edge using [Sackmesser](https://github.com/apigee/devrel/tree/main/tools/apigee-sackmesser), from local repository.

    ``` bash
    export APIGEE_EDGE_USR=<YOUR-USER-NAME>
    export APIGEE_EDGE_PWD=<YOUR-USER-PASSWORD>
    export APIGEE_EDGE_ORG=<YOUR-ORG-NAME>
    export APIGEE_EDGE_ENV=<YOUR-ENV-NAME>

    sackmesser deploy --apigeeapi -u $APIGEE_EDGE_USR -p $APIGEE_EDGE_PWD \
    -o $APIGEE_EDGE_ORG -e $APIGEE_EDGE_ENV \
    -d .
    ```
    > You can also use Apigee Edge UI, [Apigee Edge Deploy Maven Plugin](https://github.com/apigee/apigee-deploy-maven-plugin/tree/1.x) or [apigeetool](https://github.com/apigee/apigeetool-node), to deploy the proxy.



## Test

You can now test your proxy.

``` bash
curl -i -X GET  'https://<YOUR-HOSTNAME>/v1/appint' | jq
```

``` json
[
  {
    "id": "0PUK6V6EV0",
    "name": "Vintage Record Player",
    "description": "It still works.",
    "picture": "/img/products/record-player.jpg",
    "priceUsd": 65.5,
    "categories": "music"
  },
  {
    "id": "1YMWWN1N4O",
    "name": "Home Barista Kit",
    "description": "Always wanted to brew coffee with Chemex and Aeropress at home?",
    "picture": "/img/products/barista-kit.jpg",
    "priceUsd": 123.99,
    "categories": "cookware"
  },
  {
    "id": "2ZYFJ3GM2N",
    "name": "Film Camera",
    "description": "This camera looks like it's a film camera, but it's actually digital.",
    "picture": "/img/products/film-camera.jpg",
    "priceUsd": 2244.99,
    "categories": "photography"
  }
]
```


``` bash
curl -i -X GET  'https://<YOUR-HOSTNAME>/v1/appint/<YOUR-PRODUCT-ID>' | jq
```


```json
{
  "id": "1YMWWN1N4O",
  "name": "Home Barista Kit",
  "description": "Always wanted to brew coffee with Chemex and Aeropress at home?",
  "picture": "/img/products/barista-kit.jpg",
  "priceUsd": 123.99,
  "categories": "cookware"
}
```



Et voilà !!