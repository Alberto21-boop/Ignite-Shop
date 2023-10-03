export const makeHttpRequest = (
  url = "",
  requestType = "GET",
  data = {},
  callback
) => {
  fetch(url, {
    method: requestType,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((response) => response.json())
    .then((data) => {
      callback(data);
    })
    .catch((error) => {
      callback({ error: "Something went wrong! Please try later." });
    });
};

export const setState = ({ key, value }) => {
  const previousState = vscode.getState();
  const state = previousState ? { ...previousState } : {};
  vscode.setState({ ...state, [key]: value });
};

export const getState = (key) => {
  const previousState = vscode.getState();

  return previousState ? previousState[key] : null;
};

export const capitalizeFirstLetter = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

export const sortComponents = (tabs) => {
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

export const reduceTabs = (tabs) => {
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

export const passComponentToEditor = async (
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

export const componentLocked = (vscode) => {
  vscode.postMessage({
    type: "componentLocked",
  });
};
