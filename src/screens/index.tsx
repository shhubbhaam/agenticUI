import React from "react";
import { View, Text, Image, TouchableOpacity, } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
export default () => {
	return (
		<SafeAreaView 
			style={{
				flex: 1,
				backgroundColor: "#FFFFFF",
			}}>
			<View 
				style={{
					flex: 1,
					paddingVertical: 44,
				}}>
				<View 
					style={{
						alignSelf: "flex-start",
						flexDirection: "row",
						alignItems: "center",
						marginBottom: 27,
						marginLeft: 48,
					}}>
					<Text 
						style={{
							color: "#9AA5B8",
							fontSize: 11,
							fontWeight: "bold",
							marginRight: 15,
						}}>
						{"07"}
					</Text>
					<Text 
						style={{
							color: "#182033",
							fontSize: 22,
							fontWeight: "bold",
							marginRight: 15,
						}}>
						{"Navigation"}
					</Text>
					<Text 
						style={{
							color: "#4B5468",
							fontSize: 13,
						}}>
						{"Five-slot grid so the V2 Community tab arrives without shifting a single existing label."}
					</Text>
				</View>
				<View 
					style={{
						flexDirection: "row",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: 12,
						marginLeft: 48,
						marginRight: 308,
					}}>
					<Text 
						style={{
							color: "#9AA5B8",
							fontSize: 11,
							fontWeight: "bold",
						}}>
						{"Bottom nav · 390dp · Today active"}
					</Text>
					<Text 
						style={{
							color: "#9AA5B8",
							fontSize: 11,
							fontWeight: "bold",
						}}>
						{"Bottom nav · 360dp · reserved slot annotated"}
					</Text>
				</View>
				<View 
					style={{
						flexDirection: "row",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: 8,
						marginLeft: 48,
						marginRight: 173,
					}}>
					<View 
						style={{
							width: 390,
							backgroundColor: "#FFFFFF",
							paddingVertical: 4,
						}}>
						<View 
							style={{
								width: 45,
								height: 3,
								backgroundColor: "#3157D5",
								marginBottom: 8,
								marginLeft: 17,
							}}>
						</View>
						<View 
							style={{
								alignSelf: "flex-start",
								flexDirection: "row",
								alignItems: "center",
								marginBottom: 7,
								marginLeft: 27,
							}}>
							<Image
								source = {{uri: "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/Rer4SjqhX5/1jbu5i95_expires_30_days.png"}} 
								resizeMode = {"stretch"}
								style={{
									width: 24,
									height: 24,
									marginRight: 53,
								}}
							/>
							<Image
								source = {{uri: "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/Rer4SjqhX5/m5y043pk_expires_30_days.png"}} 
								resizeMode = {"stretch"}
								style={{
									width: 24,
									height: 24,
									marginRight: 53,
								}}
							/>
							<Image
								source = {{uri: "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/Rer4SjqhX5/eq16jiy4_expires_30_days.png"}} 
								resizeMode = {"stretch"}
								style={{
									width: 24,
									height: 24,
									marginRight: 53,
								}}
							/>
							<Image
								source = {{uri: "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/Rer4SjqhX5/awwj8swb_expires_30_days.png"}} 
								resizeMode = {"stretch"}
								style={{
									width: 24,
									height: 24,
								}}
							/>
						</View>
						<View 
							style={{
								alignSelf: "flex-start",
								flexDirection: "row",
								alignItems: "center",
								marginBottom: 22,
								marginLeft: 19,
							}}>
							<Text 
								style={{
									color: "#3157D5",
									fontSize: 11,
									fontWeight: "bold",
									marginRight: 44,
								}}>
								{"Today"}
							</Text>
							<Text 
								style={{
									color: "#4B5468",
									fontSize: 11,
									fontWeight: "bold",
									marginRight: 35,
								}}>
								{"Path"}
							</Text>
							<Text 
								style={{
									color: "#4B5468",
									fontSize: 11,
									fontWeight: "bold",
									marginRight: 36,
								}}>
								{"Practice"}
							</Text>
							<Text 
								style={{
									color: "#4B5468",
									fontSize: 11,
									fontWeight: "bold",
								}}>
								{"You"}
							</Text>
						</View>
						<View 
							style={{
								alignItems: "center",
							}}>
							<View 
								style={{
									width: 120,
								}}>
								<View 
									style={{
										height: 4,
									}}>
								</View>
								<View 
									style={{
										height: 4,
										backgroundColor: "#CBD3DF",
										borderRadius: 999,
									}}>
								</View>
							</View>
						</View>
					</View>
					<View 
						style={{
							width: 442,
						}}>
						<View 
							style={{
								width: 360,
								backgroundColor: "#FFFFFF",
								borderColor: "#EDF1F6",
								borderWidth: 1,
								paddingVertical: 6,
								marginBottom: 14,
							}}>
							<View 
								style={{
									width: 43,
									height: 3,
									backgroundColor: "#3157D5",
									marginBottom: 7,
									marginLeft: 86,
								}}>
							</View>
							<View 
								style={{
									flexDirection: "row",
									alignItems: "center",
									marginHorizontal: 17,
								}}>
								<View 
									style={{
										alignItems: "center",
										marginRight: 38,
									}}>
									<Image
										source = {{uri: "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/Rer4SjqhX5/7qxut2n8_expires_30_days.png"}} 
										resizeMode = {"stretch"}
										style={{
											width: 24,
											height: 24,
											marginBottom: 7,
										}}
									/>
									<Text 
										style={{
											color: "#4B5468",
											fontSize: 11,
											fontWeight: "bold",
										}}>
										{"Today"}
									</Text>
								</View>
								<View 
									style={{
										alignItems: "center",
										marginRight: 29,
									}}>
									<Image
										source = {{uri: "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/Rer4SjqhX5/c44b20f4_expires_30_days.png"}} 
										resizeMode = {"stretch"}
										style={{
											width: 24,
											height: 24,
											marginBottom: 7,
										}}
									/>
									<Text 
										style={{
											color: "#3157D5",
											fontSize: 11,
											fontWeight: "bold",
										}}>
										{"Path"}
									</Text>
								</View>
								<View 
									style={{
										alignItems: "center",
										marginRight: 30,
									}}>
									<Image
										source = {{uri: "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/Rer4SjqhX5/9arvpgpo_expires_30_days.png"}} 
										resizeMode = {"stretch"}
										style={{
											width: 24,
											height: 24,
											marginBottom: 7,
										}}
									/>
									<Text 
										style={{
											color: "#4B5468",
											fontSize: 11,
											fontWeight: "bold",
										}}>
										{"Practice"}
									</Text>
								</View>
								<View 
									style={{
										alignItems: "center",
										marginRight: 33,
									}}>
									<Image
										source = {{uri: "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/Rer4SjqhX5/enbd9xjh_expires_30_days.png"}} 
										resizeMode = {"stretch"}
										style={{
											width: 24,
											height: 24,
											marginBottom: 7,
										}}
									/>
									<Text 
										style={{
											color: "#4B5468",
											fontSize: 11,
											fontWeight: "bold",
										}}>
										{"You"}
									</Text>
								</View>
								<View 
									style={{
										borderColor: "#CBD3DF",
										borderWidth: 1,
										paddingVertical: 17,
										paddingHorizontal: 18,
									}}>
									<Text 
										style={{
											color: "#9AA5B8",
											fontSize: 11,
											fontWeight: "bold",
										}}>
										{"V2"}
									</Text>
								</View>
							</View>
						</View>
						<Text 
							style={{
								color: "#9AA5B8",
								fontSize: 13,
							}}>
							{"At 360dp each slot is 72dp wide; “Practice” still sets on one line at micro."}
						</Text>
					</View>
				</View>
				<Text 
					style={{
						color: "#9AA5B8",
						fontSize: 13,
						marginBottom: 44,
						marginLeft: 48,
					}}>
					{"Slot 5 ships empty. Labels never truncate, so tab meaning survives without icon literacy."}
				</Text>
				<View 
					style={{
						flexDirection: "row",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: 12,
						marginLeft: 48,
						marginRight: 151,
					}}>
					<Text 
						style={{
							color: "#9AA5B8",
							fontSize: 11,
							fontWeight: "bold",
						}}>
						{"App header · ORIENT zone"}
					</Text>
					<Text 
						style={{
							color: "#9AA5B8",
							fontSize: 11,
							fontWeight: "bold",
						}}>
						{"Back header · reading view"}
					</Text>
					<View 
						style={{
							width: 163,
							height: 8,
						}}>
					</View>
				</View>
				<View 
					style={{
						width: 820,
						flexDirection: "row",
						alignItems: "center",
						marginBottom: 14,
						marginLeft: 48,
					}}>
					<View 
						style={{
							flex: 1,
							flexDirection: "row",
							alignItems: "center",
							backgroundColor: "#FFFFFF",
							borderColor: "#EDF1F6",
							borderWidth: 1,
							paddingVertical: 14,
							paddingHorizontal: 21,
							marginRight: 40,
						}}>
						<View 
							style={{
								alignItems: "center",
							}}>
							<Text 
								style={{
									color: "#9AA5B8",
									fontSize: 11,
									fontWeight: "bold",
									marginBottom: 9,
								}}>
								{"Thursday"}
							</Text>
							<Text 
								style={{
									color: "#182033",
									fontSize: 18,
									fontWeight: "bold",
								}}>
								{"Today"}
							</Text>
						</View>
						<View 
							style={{
								flex: 1,
								alignSelf: "stretch",
							}}>
						</View>
						<TouchableOpacity 
							style={{
								flexDirection: "row",
								alignItems: "center",
								backgroundColor: "#EDF1F6",
								borderRadius: 999,
								padding: 9,
								marginRight: 8,
							}} onPress={()=>console.log('Pressed!')}>
							<Image
								source = {{uri: "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/Rer4SjqhX5/ubrmz3bh_expires_30_days.png"}} 
								resizeMode = {"stretch"}
								style={{
									borderRadius: 999,
									width: 14,
									height: 14,
									marginRight: 5,
								}}
							/>
							<Text 
								style={{
									color: "#182033",
									fontSize: 15,
									fontWeight: "bold",
								}}>
								{"12"}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity 
							style={{
								flexDirection: "row",
								alignItems: "center",
								backgroundColor: "#EDF1F6",
								borderRadius: 999,
								padding: 9,
								marginRight: 9,
							}} onPress={()=>console.log('Pressed!')}>
							<Image
								source = {{uri: "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/Rer4SjqhX5/0gh6xrjy_expires_30_days.png"}} 
								resizeMode = {"stretch"}
								style={{
									borderRadius: 999,
									width: 14,
									height: 14,
									marginRight: 5,
								}}
							/>
							<Text 
								style={{
									color: "#182033",
									fontSize: 15,
									fontWeight: "bold",
								}}>
								{"1,480"}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity 
							style={{
								backgroundColor: "#EDF1F6",
								borderColor: "#EDF1F6",
								borderRadius: 999,
								borderWidth: 1,
								paddingVertical: 14,
								paddingHorizontal: 10,
							}} onPress={()=>console.log('Pressed!')}>
							<Text 
								style={{
									color: "#4B5468",
									fontSize: 11,
									fontWeight: "bold",
								}}>
								{"RM"}
							</Text>
						</TouchableOpacity>
					</View>
					<View 
						style={{
							flex: 1,
							flexDirection: "row",
							alignItems: "center",
							backgroundColor: "#FDFCF9",
							borderColor: "#EDF1F6",
							borderWidth: 1,
							paddingVertical: 17,
							paddingHorizontal: 24,
						}}>
						<Image
							source = {{uri: "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/Rer4SjqhX5/k1q6stof_expires_30_days.png"}} 
							resizeMode = {"stretch"}
							style={{
								width: 24,
								height: 24,
								marginRight: 20,
							}}
						/>
						<View 
							style={{
								width: 168,
							}}>
							<Text 
								style={{
									color: "#9AA5B8",
									fontSize: 11,
									fontWeight: "bold",
									marginBottom: 9,
								}}>
								{"Stage 2 · Article"}
							</Text>
							<View 
								style={{
									alignItems: "center",
								}}>
								<Text 
									style={{
										color: "#182033",
										fontSize: 15,
										fontWeight: "bold",
									}}>
									{"Grounding vs. guessing"}
								</Text>
							</View>
						</View>
						<View 
							style={{
								flex: 1,
								alignSelf: "stretch",
							}}>
						</View>
						<Text 
							style={{
								color: "#4B5468",
								fontSize: 17,
								fontWeight: "bold",
								marginRight: 35,
							}}>
							{"Aa"}
						</Text>
						<Image
							source = {{uri: "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/Rer4SjqhX5/d50dx3ab_expires_30_days.png"}} 
							resizeMode = {"stretch"}
							style={{
								width: 22,
								height: 22,
							}}
						/>
					</View>
				</View>
				<Text 
					style={{
						color: "#9AA5B8",
						fontSize: 13,
						marginBottom: 44,
						marginLeft: 478,
					}}>
					{"Back target is a full 48×48. The headphone action switches the same lesson to audio."}
				</Text>
				<Text 
					style={{
						color: "#9AA5B8",
						fontSize: 11,
						fontWeight: "bold",
						marginBottom: 11,
						marginLeft: 48,
					}}>
					{"AI Coach control · default / pressed / labelled / thinking"}
				</Text>
				<View 
					style={{
						alignSelf: "flex-start",
						flexDirection: "row",
						alignItems: "center",
						backgroundColor: "#F7F9FC",
						paddingVertical: 8,
						marginBottom: 14,
						marginLeft: 48,
					}}>
					<Image
						source = {{uri: "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/Rer4SjqhX5/2q7mn2wd_expires_30_days.png"}} 
						resizeMode = {"stretch"}
						style={{
							borderRadius: 999,
							width: 56,
							height: 56,
							marginRight: 16,
						}}
					/>
					<Image
						source = {{uri: "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/Rer4SjqhX5/gnluzgu4_expires_30_days.png"}} 
						resizeMode = {"stretch"}
						style={{
							borderRadius: 999,
							width: 56,
							height: 56,
							marginRight: 16,
						}}
					/>
					<TouchableOpacity 
						style={{
							flexDirection: "row",
							alignItems: "center",
							backgroundColor: "#3157D5",
							borderColor: "#F7F9FC",
							borderRadius: 999,
							borderWidth: 3,
							paddingVertical: 17,
							paddingHorizontal: 18,
							marginRight: 17,
						}} onPress={()=>console.log('Pressed!')}>
						<Image
							source = {{uri: "https://storage.googleapis.com/tagjs-prod.appspot.com/v1/Rer4SjqhX5/ttlqk74j_expires_30_days.png"}} 
							resizeMode = {"stretch"}
							style={{
								borderRadius: 999,
								width: 22,
								height: 22,
								marginRight: 10,
							}}
						/>
						<Text 
							style={{
								color: "#FFFFFF",
								fontSize: 15,
								fontWeight: "bold",
							}}>
							{"Ask about this"}
						</Text>
					</TouchableOpacity>
					<View 
						style={{
							flexDirection: "row",
							alignItems: "center",
							backgroundColor: "#FFFFFF",
							borderColor: "#CBD3DF",
							borderRadius: 999,
							borderWidth: 1,
							paddingVertical: 23,
							paddingHorizontal: 20,
						}}>
						<Text 
							style={{
								color: "#4B5468",
								fontSize: 15,
								fontWeight: "bold",
								marginRight: 12,
							}}>
							{"Thinking"}
						</Text>
						<View 
							style={{
								width: 6,
								height: 6,
								backgroundColor: "#3157D5",
								borderRadius: 999,
								marginRight: 5,
							}}>
						</View>
						<View 
							style={{
								width: 6,
								height: 6,
								backgroundColor: "#3157D5",
								borderRadius: 999,
								marginRight: 5,
							}}>
						</View>
						<View 
							style={{
								width: 6,
								height: 6,
								backgroundColor: "#3157D5",
								borderRadius: 999,
							}}>
						</View>
					</View>
				</View>
				<Text 
					style={{
						color: "#9AA5B8",
						fontSize: 13,
						marginLeft: 48,
					}}>
					{"No shadow: a 3px surface.base ring separates it from scrolling content instead."}
				</Text>
			</View>
		</SafeAreaView>
	)
}